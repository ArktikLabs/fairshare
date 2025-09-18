import { PrismaClient } from '@prisma/client';

const SYSTEM_USER_EMAIL = "system@fair.share";
const GLOBAL_SCOPE = "global";

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding notification templates...');

  // Define notification templates based on your requirements
  const notificationTemplates = [
    // Groups and friends
    {
      key: 'group_invite',
      name: 'Group Invitation',
      description: 'When someone adds me to a group',
      category: 'groups',
      defaultEmail: true,
      defaultPush: true,
      required: false,
    },
    {
      key: 'friend_request',
      name: 'Friend Request',
      description: 'When someone adds me as a friend',
      category: 'groups',
      defaultEmail: true,
      defaultPush: true,
      required: false,
    },
    
    // Expenses
    {
      key: 'expense_added',
      name: 'Expense Added',
      description: 'When an expense is added',
      category: 'expenses',
      defaultEmail: true,
      defaultPush: true,
      required: false,
    },
    {
      key: 'expense_edited',
      name: 'Expense Edited/Deleted',
      description: 'When an expense is edited or deleted',
      category: 'expenses',
      defaultEmail: true,
      defaultPush: true,
      required: false,
    },
    {
      key: 'expense_comment',
      name: 'Expense Comment',
      description: 'When someone comments on an expense',
      category: 'expenses',
      defaultEmail: true,
      defaultPush: true,
      required: false,
    },
    {
      key: 'expense_due',
      name: 'Expense Due',
      description: 'When an expense is due',
      category: 'expenses',
      defaultEmail: true,
      defaultPush: true,
      required: false,
    },
    {
      key: 'payment_received',
      name: 'Payment Received',
      description: 'When someone pays me',
      category: 'expenses',
      defaultEmail: true,
      defaultPush: true,
      required: false,
    },
    
    // News and updates
    {
      key: 'monthly_summary',
      name: 'Monthly Activity Summary',
      description: 'Monthly summary of my activity',
      category: 'news',
      defaultEmail: true,
      defaultPush: false,
      required: false,
    },
    {
      key: 'news_updates',
      name: 'FairShare News and Updates',
      description: 'Major FairShare news and updates',
      category: 'news',
      defaultEmail: false,
      defaultPush: false,
      required: false,
    },
  ];

  // Create notification templates
  for (const template of notificationTemplates) {
    await prisma.notificationTemplate.upsert({
      where: { key: template.key },
      update: template,
      create: template,
    });
    console.log(`✅ Created/updated template: ${template.name}`);
  }

  console.log('🌱 Seeding global expense categories...');

  const systemUser = await prisma.user.upsert({
    where: { email: SYSTEM_USER_EMAIL },
    update: {},
    create: {
      email: SYSTEM_USER_EMAIL,
      name: 'FairShare System',
      image: null,
      password: null,
    },
  });

  const parentDefinitions = [
    { name: "Entertainment", icon: "🎬", color: "#a855f7", description: "Movies, concerts, hobbies" },
    { name: "Food and Drink", icon: "🍽️", color: "#f97316", description: "Meals, groceries, coffee" },
    { name: "Home", icon: "🏠", color: "#0ea5e9", description: "Rent, mortgage, furnishings" },
    { name: "Life", icon: "❤️", color: "#ec4899", description: "Health, family, personal care" },
    { name: "Transportation", icon: "🚗", color: "#22c55e", description: "Transit, fuel, rideshare" },
    { name: "Utilities", icon: "💡", color: "#6366f1", description: "Household services and bills" },
    { name: "Uncategorized", icon: "🗂️", color: "#475569", description: "Miscellaneous expenses" },
  ];

  const parentMap = new Map<string, string>();
  for (const parent of parentDefinitions) {
    const record = await upsertParentCategory(
      systemUser.id,
      { parentId: null, name: parent.name, icon: parent.icon, color: parent.color, description: parent.description }
    );

    parentMap.set(parent.name, record.id);
  }

  const childDefinitions = [
    { parent: "Entertainment", name: "Movies & Shows", icon: "🎟️", color: "#c084fc" },
    { parent: "Entertainment", name: "Streaming Services", icon: "📺", color: "#8b5cf6" },
    { parent: "Entertainment", name: "Games & Apps", icon: "🎮", color: "#6366f1" },
    { parent: "Food and Drink", name: "Groceries", icon: "🛒", color: "#f59e0b" },
    { parent: "Food and Drink", name: "Restaurants & Takeout", icon: "🍔", color: "#fb923c" },
    { parent: "Food and Drink", name: "Coffee & Snacks", icon: "☕", color: "#facc15" },
    { parent: "Home", name: "Rent & Mortgage", icon: "🏡", color: "#38bdf8" },
    { parent: "Home", name: "Maintenance & Repairs", icon: "🛠️", color: "#0ea5e9" },
    { parent: "Home", name: "Furniture & Decor", icon: "🪑", color: "#0284c7" },
    { parent: "Life", name: "Health & Wellness", icon: "💊", color: "#f472b6" },
    { parent: "Life", name: "Education & Learning", icon: "🎓", color: "#14b8a6" },
    { parent: "Life", name: "Gifts & Donations", icon: "🎁", color: "#ec4899" },
    { parent: "Transportation", name: "Fuel", icon: "⛽", color: "#4ade80" },
    { parent: "Transportation", name: "Public Transit", icon: "🚌", color: "#22c55e" },
    { parent: "Transportation", name: "Rideshare & Taxi", icon: "🚕", color: "#16a34a" },
    { parent: "Utilities", name: "Electricity", icon: "⚡", color: "#818cf8" },
    { parent: "Utilities", name: "Water & Sewer", icon: "🚰", color: "#6366f1" },
    { parent: "Utilities", name: "Internet & TV", icon: "🌐", color: "#4f46e5" },
    { parent: "Utilities", name: "Mobile Phone", icon: "📱", color: "#4338ca" },
  ];

  await prisma.$transaction(
    childDefinitions.map(({ parent, ...childData }) => {
      const parentId = parentMap.get(parent);
      if (!parentId) return prisma.$executeRaw`SELECT 1`;

      return prisma.expenseCategory.upsert({
        where: {
          ownerId_parentId_name: {
            ownerId: systemUser.id,
            parentId,
            name: childData.name,
          },
        },
        update: {
          ...childData,
          scope: GLOBAL_SCOPE,
          ownerId: systemUser.id,
          parentId,
        },
        create: {
          ...childData,
          scope: GLOBAL_SCOPE,
          ownerId: systemUser.id,
          parentId,
        },
      });
    }),
  );

  console.log('🎉 Seeding completed successfully!');
}

async function upsertParentCategory(systemUserId: any, data: { parentId: string | null; name: string; icon?: string; color?: string; description?: string }) {
  const existing = await prisma.expenseCategory.findFirst({
    where: { ownerId: systemUserId, parentId: data.parentId, name: data.name },
  });

  if (existing) {
    return prisma.expenseCategory.update({
      where: { id: existing.id },
      data: { ...data, scope: GLOBAL_SCOPE, ownerId: systemUserId },
    });
  }

  return prisma.expenseCategory.create({
    data: { ...data, scope: GLOBAL_SCOPE, ownerId: systemUserId },
  });
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
