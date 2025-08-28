import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For now, just return a success message
    // This would export user data including expenses, groups, etc.
    return NextResponse.json({
      message: "Account data export initiated",
      status: "processing",
      estimatedTime: "5-10 minutes",
      downloadUrl: null, // Would be generated after processing
    });
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
