import { PrismaClient } from '@prisma/client';

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

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
