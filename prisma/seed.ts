import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create Users
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin123', salt);
  const demoPasswordHash = await bcrypt.hash('demo123', salt);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@unifiedinbox.com' },
    update: {},
    create: {
      id: 'usr-admin',
      email: 'admin@unifiedinbox.com',
      passwordHash,
      name: 'Platform Administrator',
      role: 'SUPERADMIN',
      emailVerified: true,
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: 'sarah@acmedental.com' },
    update: {},
    create: {
      id: 'usr-sarah',
      email: 'sarah@acmedental.com',
      passwordHash: demoPasswordHash,
      name: 'Dr. Sarah Mitchell',
      role: 'OWNER',
      emailVerified: true,
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'alex@acmedental.com' },
    update: {},
    create: {
      id: 'usr-alex',
      email: 'alex@acmedental.com',
      passwordHash: demoPasswordHash,
      name: 'Alex Rivera',
      role: 'AGENT',
      emailVerified: true,
    },
  });

  console.log('✅ Users created');

  // 2. Primary Workspace: Acme Dental & Wellness Clinic
  const workspaceId = 'ws-acme-default';

  // Clean previous seed data for idempotent seeding
  await prisma.message.deleteMany({ where: { workspaceId } });
  await prisma.conversationAssignment.deleteMany({ where: { conversation: { workspaceId } } });
  await prisma.conversation.deleteMany({ where: { workspaceId } });
  await prisma.customer.deleteMany({ where: { workspaceId } });
  await prisma.businessKnowledgeChunk.deleteMany({ where: { workspaceId } });
  await prisma.businessKnowledgeDocument.deleteMany({ where: { workspaceId } });
  await prisma.product.deleteMany({ where: { workspaceId } });
  await prisma.service.deleteMany({ where: { workspaceId } });
  await prisma.aIMessageLog.deleteMany({ where: { workspaceId } });
  await prisma.internalNote.deleteMany({ where: { workspaceId } });
  await prisma.subscription.deleteMany({ where: { workspaceId } });
  await prisma.payment.deleteMany({ where: { workspaceId } });
  await prisma.connectedAccount.deleteMany({ where: { workspaceId } });
  await prisma.businessProfile.deleteMany({ where: { workspaceId } });
  await prisma.aIConfiguration.deleteMany({ where: { workspaceId } });
  await prisma.workspaceMember.deleteMany({ where: { workspaceId } });
  await prisma.workspace.deleteMany({ where: { id: workspaceId } });

  const workspace = await prisma.workspace.upsert({
    where: { id: workspaceId },
    update: {},
    create: {
      id: workspaceId,
      name: 'Acme Dental & Wellness Clinic',
      slug: 'acme-dental-clinic',
      ownerId: owner.id,
      members: {
        create: [
          { userId: owner.id, role: 'OWNER' },
          { userId: agent.id, role: 'AGENT' },
          { userId: admin.id, role: 'ADMIN' },
        ],
      },
      accounts: {
        create: [
          {
            platform: 'WHATSAPP',
            accountName: 'Acme Dental WhatsApp (+91 98765 43210)',
            accountId: '109876543210987',
            status: 'CONNECTED',
            lastSyncAt: new Date(),
          },
          {
            platform: 'INSTAGRAM',
            accountName: '@acme_dental_clinic',
            accountId: '17841400012345678',
            status: 'CONNECTED',
            lastSyncAt: new Date(),
          },
          {
            platform: 'MESSENGER',
            accountName: 'Acme Dental Official Page',
            accountId: '102938475601928',
            status: 'CONNECTED',
            lastSyncAt: new Date(),
          },
          {
            platform: 'LIVECHAT',
            accountName: 'Clinic Website Live Chat',
            accountId: 'lc-acme-dental',
            status: 'CONNECTED',
            lastSyncAt: new Date(),
          },
        ],
      },
      businessProfile: {
        create: {
          businessName: 'Acme Dental & Wellness Clinic',
          description: 'Comprehensive dental care, preventive dentistry, cosmetic procedures, and aligners.',
          industry: 'Healthcare / Dental',
          location: '102 Medical Enclave, Sector 18, Gurugram, Haryana 122002',
          contactEmail: 'contact@acmedental.com',
          contactPhone: '+91 98765 43210',
          businessHours: 'Mon - Sat: 9:00 AM - 7:00 PM, Sun: 10:00 AM - 2:00 PM',
          website: 'https://acmedental.example.com',
          supportInstructions: 'Be compassionate and clear. Never prescribe prescription drugs directly; advise in-clinic consultation.',
          faqs: JSON.stringify([
            {
              question: 'What are your clinic hours?',
              answer: 'We are open Monday to Saturday from 9:00 AM to 7:00 PM, and Sunday from 10:00 AM to 2:00 PM.',
            },
            {
              question: 'Do you offer emergency dental appointments?',
              answer: 'Yes, we keep slots open daily for acute toothache and emergency trauma. Please call our helpline directly.',
            },
            {
              question: 'What is your consultation fee?',
              answer: 'General doctor consultation fee is ₹500 ($10 USD), which is waived if a procedure is scheduled.',
            },
          ]),
        },
      },
      aiConfig: {
        create: {
          autoReplyEnabled: true,
          humanReviewEnabled: false,
          personality: 'Empathetic, reassuring, and precise medical assistant',
          businessTone: 'Warm, professional, and courteous',
          defaultLanguage: 'auto',
          greetingMessage: 'Welcome to Acme Dental Clinic! How can we assist you with your dental health today?',
          fallbackMessage: "I apologize, but I don't have that information right now. Please wait a moment while our clinic coordinator assists you.",
        },
      },
      subscriptions: {
        create: [
          {
            plan: 'GROWTH',
            status: 'ACTIVE',
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    },
  });

  console.log('✅ Acme Dental Workspace seeded');

  // 3. Products & Services for Acme Dental
  await prisma.service.createMany({
    data: [
      {
        workspaceId,
        name: 'Teeth Cleaning & Polishing (Scaling)',
        price: 1500,
        duration: '45 mins',
        category: 'Preventive',
        description: 'Ultrasonic removal of plaque and tartar with enamel fluoride polish.',
      },
      {
        workspaceId,
        name: 'Root Canal Treatment (Single Sitting)',
        price: 4500,
        duration: '60 mins',
        category: 'Endodontics',
        description: 'Advanced painless rotary RCT with digital apex locator.',
      },
      {
        workspaceId,
        name: 'Invisible Teeth Aligners (Full Course)',
        price: 45000,
        duration: '6-9 months',
        category: 'Orthodontics',
        description: 'Custom clear aligner trays with 3D intraoral digital scan.',
      },
    ],
  });

  await prisma.product.createMany({
    data: [
      {
        workspaceId,
        name: 'Sonic Electric Toothbrush Pro',
        price: 2499,
        category: 'Home Care',
        description: '40,000 vibrations/min with pressure sensor and 2-minute timer.',
      },
      {
        workspaceId,
        name: 'Enamel Remineralizing Gel',
        price: 650,
        category: 'Oral Health',
        description: 'Nano-hydroxyapatite formulation to soothe tooth sensitivity.',
      },
    ],
  });

  // 4. Seed Knowledge Documents & Chunks
  const doc = await prisma.businessKnowledgeDocument.create({
    data: {
      workspaceId,
      title: 'Clinic Policies & Insurance Guidelines',
      sourceType: 'FORM',
      rawContent:
        'Acme Dental Clinic accepts all major health insurances and cashless TPA cards including Star Health, HDFC Ergo, and Max Bupa. Cancellations must be made at least 2 hours prior to avoid late rebooking charges.',
      status: 'PROCESSED',
    },
  });

  await prisma.businessKnowledgeChunk.create({
    data: {
      workspaceId,
      documentId: doc.id,
      chunkText:
        'Acme Dental Clinic accepts all major health insurances and cashless TPA cards including Star Health, HDFC Ergo, and Max Bupa. Cancellations must be made at least 2 hours prior to avoid late rebooking charges.',
      keywords: 'insurance, cashless, tpa, policy, cancellation',
    },
  });

  // 5. Seed Conversations & Messages Across Channels
  // A. WhatsApp Conversation (English)
  const cust1 = await prisma.customer.create({
    data: {
      workspaceId,
      externalId: '+919811223344',
      name: 'Rohan Gupta',
      phone: '+91 98112 23344',
    },
  });

  const conv1 = await prisma.conversation.create({
    data: {
      workspaceId,
      customerId: cust1.id,
      channel: 'WHATSAPP',
      status: 'OPEN',
      lastMessageContent: 'Our business hours at Acme Dental & Wellness Clinic are: Mon - Sat: 9:00 AM - 7:00 PM, Sun: 10:00 AM - 2:00 PM.',
      lastMessageAt: new Date(Date.now() - 15 * 60 * 1000),
      unreadCount: 0,
      lastIntent: 'BUSINESS_HOURS',
      lastSentiment: 'POSITIVE',
    },
  });

  await prisma.message.createMany({
    data: [
      {
        workspaceId,
        conversationId: conv1.id,
        channel: 'WHATSAPP',
        senderType: 'CUSTOMER',
        senderName: 'Rohan Gupta',
        senderExternalId: '+919811223344',
        content: 'Hi! What time does your clinic open and close today?',
        direction: 'INBOUND',
        status: 'DELIVERED',
        createdAt: new Date(Date.now() - 16 * 60 * 1000),
      },
      {
        workspaceId,
        conversationId: conv1.id,
        channel: 'WHATSAPP',
        senderType: 'AI_BOT',
        senderName: 'AI Assistant',
        content: 'Our business hours at Acme Dental & Wellness Clinic are: Mon - Sat: 9:00 AM - 7:00 PM, Sun: 10:00 AM - 2:00 PM.',
        direction: 'OUTBOUND',
        status: 'DELIVERED',
        isAiGenerated: true,
        aiConfidence: 0.96,
        aiIntent: 'BUSINESS_HOURS',
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
      },
    ],
  });

  // B. Instagram Conversation (Hinglish)
  const cust2 = await prisma.customer.create({
    data: {
      workspaceId,
      externalId: 'ig_priya_sharma_99',
      name: 'Priya Sharma',
      handle: '@priya_sharma_99',
    },
  });

  const conv2 = await prisma.conversation.create({
    data: {
      workspaceId,
      customerId: cust2.id,
      channel: 'INSTAGRAM',
      status: 'OPEN',
      lastMessageContent: 'Teeth Cleaning & Polishing (Scaling) ka charge ₹1500 (45 mins) hai.',
      lastMessageAt: new Date(Date.now() - 45 * 60 * 1000),
      unreadCount: 0,
      lastIntent: 'PRICING_SPEC',
      lastSentiment: 'NEUTRAL',
    },
  });

  await prisma.message.createMany({
    data: [
      {
        workspaceId,
        conversationId: conv2.id,
        channel: 'INSTAGRAM',
        senderType: 'CUSTOMER',
        senderName: 'Priya Sharma',
        content: 'Bhai teeth cleaning ka kitna charge hoga? Thoda pricing batao na please.',
        direction: 'INBOUND',
        status: 'DELIVERED',
        createdAt: new Date(Date.now() - 46 * 60 * 1000),
      },
      {
        workspaceId,
        conversationId: conv2.id,
        channel: 'INSTAGRAM',
        senderType: 'AI_BOT',
        senderName: 'AI Assistant',
        content: 'Teeth Cleaning & Polishing (Scaling) ka charge ₹1500 (45 mins) hai. Ultrasonic removal of plaque and tartar with enamel fluoride polish.',
        direction: 'OUTBOUND',
        status: 'DELIVERED',
        isAiGenerated: true,
        aiConfidence: 0.93,
        aiIntent: 'PRICING_SPEC',
        createdAt: new Date(Date.now() - 45 * 60 * 1000),
      },
    ],
  });

  // C. Facebook Messenger Conversation (Hindi)
  const cust3 = await prisma.customer.create({
    data: {
      workspaceId,
      externalId: 'fb_vikram_singh',
      name: 'विक्रम सिंह',
    },
  });

  const conv3 = await prisma.conversation.create({
    data: {
      workspaceId,
      customerId: cust3.id,
      channel: 'MESSENGER',
      status: 'OPEN',
      lastMessageContent: 'Acme Dental & Wellness Clinic का पता है: 102 Medical Enclave, Sector 18, Gurugram, Haryana 122002।',
      lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      unreadCount: 0,
      lastIntent: 'LOCATION_QUERY',
      lastSentiment: 'NEUTRAL',
    },
  });

  await prisma.message.createMany({
    data: [
      {
        workspaceId,
        conversationId: conv3.id,
        channel: 'MESSENGER',
        senderType: 'CUSTOMER',
        senderName: 'विक्रम सिंह',
        content: 'नमस्ते जी, आपका क्लिनिक कहाँ पर है? मुझे पता बताइए।',
        direction: 'INBOUND',
        status: 'DELIVERED',
        createdAt: new Date(Date.now() - (2 * 60 * 60 * 1000 + 30000)),
      },
      {
        workspaceId,
        conversationId: conv3.id,
        channel: 'MESSENGER',
        senderType: 'AI_BOT',
        senderName: 'AI Assistant',
        content: 'Acme Dental & Wellness Clinic का पता है: 102 Medical Enclave, Sector 18, Gurugram, Haryana 122002। आप हमसे +91 98765 43210 पर भी संपर्क कर सकते हैं।',
        direction: 'OUTBOUND',
        status: 'DELIVERED',
        isAiGenerated: true,
        aiConfidence: 0.96,
        aiIntent: 'LOCATION_QUERY',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    ],
  });

  // D. Live Chat Conversation (Human Review Draft mode demonstration)
  const cust4 = await prisma.customer.create({
    data: {
      workspaceId,
      externalId: 'vis_site_visitor_42',
      name: 'Jessica Vance',
      email: 'jessica.vance@example.com',
    },
  });

  const conv4 = await prisma.conversation.create({
    data: {
      workspaceId,
      customerId: cust4.id,
      channel: 'LIVECHAT',
      status: 'OPEN',
      lastMessageContent: 'Do you offer cosmetic veneers and can I pay in installments?',
      lastMessageAt: new Date(Date.now() - 5 * 60 * 1000),
      unreadCount: 1,
      needsHumanReview: true,
      pendingDraftReply:
        'Hello Jessica! We do provide custom porcelain veneers. We also offer 0% interest EMI options for cosmetic dental treatments over ₹20,000. Would you like to schedule a free 15-minute consultation with Dr. Mitchell?',
      lastIntent: 'PRICING_SPEC',
      lastSentiment: 'NEUTRAL',
      escalationReason: 'Human review mode requested or custom financing inquiry',
    },
  });

  await prisma.message.create({
    data: {
      workspaceId,
      conversationId: conv4.id,
      channel: 'LIVECHAT',
      senderType: 'CUSTOMER',
      senderName: 'Jessica Vance',
      content: 'Do you offer cosmetic veneers and can I pay in installments?',
      direction: 'INBOUND',
      status: 'DELIVERED',
      createdAt: new Date(Date.now() - 5 * 60 * 1000),
    },
  });

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
