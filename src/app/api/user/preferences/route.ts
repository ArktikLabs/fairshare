import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user preferences
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
    });

    // If no preferences exist, create default ones
    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: {
          userId: session.user.id,
        },
      });
    }

    // Get all notification templates
    const notificationTemplates = await prisma.notificationTemplate.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    // Get user's notification settings
    const userNotificationSettings = await prisma.userNotificationSetting.findMany({
      where: { userId: session.user.id }
    });

    // Create missing notification settings for new templates
    const existingKeys = userNotificationSettings.map(s => s.templateKey);
    const missingTemplates = notificationTemplates.filter(t => !existingKeys.includes(t.key));
    
    if (missingTemplates.length > 0) {
      const newSettings = missingTemplates.map(template => ({
        userId: session.user.id,
        templateKey: template.key,
        emailEnabled: template.defaultEmail,
        pushEnabled: template.defaultPush,
      }));
      
      await prisma.userNotificationSetting.createMany({
        data: newSettings,
      });
      
      // Refetch settings
      const updatedNotificationSettings = await prisma.userNotificationSetting.findMany({
        where: { userId: session.user.id },
      });
      
      return NextResponse.json({
        ...preferences,
        notificationTemplates,
        notificationSettings: updatedNotificationSettings,
      });
    }

    return NextResponse.json({
      ...preferences,
      notificationTemplates,
      notificationSettings: userNotificationSettings,
    });
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { theme, currency, timezone, language, notificationSettings } = body;

    // Validate theme values
    if (theme && !["light", "dark", "system"].includes(theme)) {
      return NextResponse.json(
        { error: "Invalid theme value" },
        { status: 400 }
      );
    }

    // Validate currency (basic ISO 4217 check)
    if (currency && !/^[A-Z]{3}$/.test(currency)) {
      return NextResponse.json(
        { error: "Invalid currency code. Use ISO 4217 format (e.g., USD, EUR)" },
        { status: 400 }
      );
    }

    // Validate language (basic ISO 639-1 check)
    if (language && !/^[a-z]{2}(-[a-z]{2})?$/i.test(language)) {
      return NextResponse.json(
        { error: "Invalid language code. Use ISO 639-1 format (e.g., en, es, fr)" },
        { status: 400 }
      );
    }

    // Update user preferences
    const preferences = await prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      update: {
        ...(theme !== undefined && { theme }),
        ...(currency !== undefined && { currency }),
        ...(timezone !== undefined && { timezone }),
        ...(language !== undefined && { language }),
      },
      create: {
        userId: session.user.id,
        theme: theme || "light",
        currency: currency || "USD",
        timezone: timezone || "UTC",
        language: language || "en",
      },
    });

    // Update notification settings if provided
    if (notificationSettings && Array.isArray(notificationSettings)) {
      for (const setting of notificationSettings) {
        const { templateKey, emailEnabled, pushEnabled } = setting;
        
        if (!templateKey) continue;
        
        await prisma.userNotificationSetting.upsert({
          where: {
            userId_templateKey: {
              userId: session.user.id,
              templateKey,
            },
          },
          update: {
            ...(emailEnabled !== undefined && { emailEnabled }),
            ...(pushEnabled !== undefined && { pushEnabled }),
          },
          create: {
            userId: session.user.id,
            templateKey,
            emailEnabled: emailEnabled ?? true,
            pushEnabled: pushEnabled ?? true,
          },
        });
      }
    }

    // Return updated data
    const notificationTemplates = await prisma.notificationTemplate.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    const userNotificationSettings = await prisma.userNotificationSetting.findMany({
      where: { userId: session.user.id }
    });

    return NextResponse.json({
      ...preferences,
      notificationTemplates,
      notificationSettings: userNotificationSettings,
    });
  } catch (error) {
    console.error("Error updating user preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
