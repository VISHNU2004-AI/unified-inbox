import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticateToken, AuthRequest } from './auth.js';
import { verifyWorkspaceAccess } from './workspaces.js';

export const knowledgeRouter = Router();

// Get Business Profile
knowledgeRouter.get('/profile', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    let profile = await prisma.businessProfile.findUnique({ where: { workspaceId } });
    if (!profile) {
      profile = await prisma.businessProfile.create({
        data: {
          workspaceId,
          businessName: 'My Business',
          description: 'Business description and services',
        },
      });
    }
    res.json({ profile });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch business profile' });
  }
});

// Update Business Profile
knowledgeRouter.put('/profile', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const {
      businessName,
      description,
      industry,
      location,
      contactEmail,
      contactPhone,
      businessHours,
      website,
      faqs,
      supportInstructions,
    } = req.body;

    const profile = await prisma.businessProfile.upsert({
      where: { workspaceId },
      update: {
        businessName,
        description,
        industry,
        location,
        contactEmail,
        contactPhone,
        businessHours,
        website,
        faqs: typeof faqs === 'string' ? faqs : JSON.stringify(faqs || []),
        supportInstructions,
      },
      create: {
        workspaceId,
        businessName: businessName || 'My Business',
        description,
        industry,
        location,
        contactEmail,
        contactPhone,
        businessHours,
        website,
        faqs: typeof faqs === 'string' ? faqs : JSON.stringify(faqs || []),
        supportInstructions,
      },
    });

    res.json({ profile, message: 'Business profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update business profile' });
  }
});

// List Documents & Chunks
knowledgeRouter.get('/documents', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const documents = await prisma.businessKnowledgeDocument.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { chunks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ documents });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch knowledge documents' });
  }
});

// Add Knowledge Document (From Form, Text, or URL) & Auto-chunk
knowledgeRouter.post('/documents', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { title, sourceType = 'TEXT', rawContent, fileType } = req.body;

    if (!title || !rawContent) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const doc = await prisma.businessKnowledgeDocument.create({
      data: {
        workspaceId,
        title,
        sourceType,
        rawContent,
        fileType: fileType || 'txt',
        status: 'PROCESSED',
      },
    });

    // Auto-chunk into segments of ~300 characters
    const paragraphs = rawContent.split(/\n\n+/).filter((p: string) => p.trim().length > 0);
    const chunksData: Array<{ workspaceId: string; documentId: string; chunkText: string }> = [];

    for (const p of paragraphs) {
      if (p.length > 500) {
        // split further
        const sentences = p.split(/(?<=[.?!])\s+/);
        let curr = '';
        for (const s of sentences) {
          if ((curr + ' ' + s).length > 400) {
            chunksData.push({ workspaceId, documentId: doc.id, chunkText: curr.trim() });
            curr = s;
          } else {
            curr += ' ' + s;
          }
        }
        if (curr.trim()) {
          chunksData.push({ workspaceId, documentId: doc.id, chunkText: curr.trim() });
        }
      } else {
        chunksData.push({ workspaceId, documentId: doc.id, chunkText: p.trim() });
      }
    }

    if (chunksData.length > 0) {
      await prisma.businessKnowledgeChunk.createMany({
        data: chunksData,
      });
    }

    res.status(201).json({
      document: doc,
      chunksCreated: chunksData.length,
      message: `Document processed and split into ${chunksData.length} indexed chunks for AI retrieval`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create knowledge document' });
  }
});

// Delete Knowledge Document
knowledgeRouter.delete('/documents/:id', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.businessKnowledgeChunk.deleteMany({ where: { documentId: id } });
    await prisma.businessKnowledgeDocument.delete({ where: { id } });
    res.json({ success: true, message: 'Document and its vector chunks deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Products CRUD
knowledgeRouter.get('/products', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const products = await prisma.product.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' } });
    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

knowledgeRouter.post('/products', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { name, price, description, category, availability = true, features, terms } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Product name and price are required' });
    }

    const product = await prisma.product.create({
      data: {
        workspaceId,
        name,
        price: parseFloat(price),
        description,
        category,
        availability,
        features: typeof features === 'string' ? features : JSON.stringify(features || []),
        terms,
      },
    });
    res.status(201).json({ product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

knowledgeRouter.delete('/products/:id', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Services CRUD
knowledgeRouter.get('/services', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const services = await prisma.service.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' } });
    res.json({ services });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

knowledgeRouter.post('/services', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const { name, price, duration, description, category, availability = true } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Service name and price are required' });
    }

    const service = await prisma.service.create({
      data: {
        workspaceId,
        name,
        price: parseFloat(price),
        duration,
        description,
        category,
        availability,
      },
    });
    res.status(201).json({ service });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create service' });
  }
});

knowledgeRouter.delete('/services/:id', authenticateToken, verifyWorkspaceAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.service.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete service' });
  }
});
