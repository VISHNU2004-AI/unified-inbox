import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateToken, AuthRequest } from './auth';
import { verifyWorkspaceAccess } from './workspaces';

export const subscriptionRouter = Router();

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    interval: 'month',
    features: [
      'Connect up to 2 Channels',
      '500 AI Replies/mo',
      'Hindi, English, Hinglish Support',
      'Live Chat Widget',
      '3 Team Members',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 79,
    interval: 'month',
    popular: true,
    features: [
      'All 4 Channels (WhatsApp, IG, Messenger, LiveChat)',
      '3,000 AI Replies/mo',
      'RAG Business Knowledge Document Upload',
      'Human Review Draft Workflow',
      '10 Team Members',
      'Priority Webhook Ingestion',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    interval: 'month',
    features: [
      'Unlimited Channels & Inboxes',
      'Unlimited AI Replies',
      'Custom LLM Fine-Tuning & Knowledge Base',
      'Dedicated Account Manager',
      'SLA & 24/7 Phone Support',
      'Custom CRM Integrations',
    ],
  },
];

// Get available subscription plans
subscriptionRouter.get('/plans', (req: Request, res: Response) => {
  res.json({ plans: PLANS });
});

// Get current subscription for workspace
subscriptionRouter.get('/current', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    let subscription = await prisma.subscription.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          workspaceId,
          plan: 'GROWTH',
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    const payments = await prisma.payment.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    res.json({ subscription, payments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Create Checkout Session
subscriptionRouter.post('/create-checkout-session', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { planId } = req.body;

    // Simulate Stripe checkout url in dev
    const checkoutUrl = `/subscription?success=true&plan=${planId}`;

    // Update subscription plan
    const existingSub = await prisma.subscription.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });

    if (existingSub) {
      await prisma.subscription.update({
        where: { id: existingSub.id },
        data: { plan: planId.toUpperCase(), status: 'ACTIVE' },
      });
    } else {
      await prisma.subscription.create({
        data: {
          workspaceId,
          plan: planId.toUpperCase(),
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    res.json({ url: checkoutUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create Customer Portal
subscriptionRouter.post('/create-portal-session', authenticateToken, verifyWorkspaceAccess, (req: AuthRequest, res: Response) => {
  res.json({ url: '/subscription' });
});
