import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { uploadToGridFS } from '../config/gridfs.js';

const router = Router();

// Verify the lead belongs to this user or allow admin
async function verifyLeadAccess(user, leadId) {
  const where = { id: leadId };
  if (user.role !== 'ADMIN') where.assignedToId = user.id;
  const lead = await prisma.lead.findFirst({ where });
  return !!lead;
}

// GET all journey steps (template — not user-specific)
router.get('/steps', authenticate, async (req, res) => {
  try {
    const { category } = req.query;
    const where = category ? { category } : {};
    const steps = await prisma.journeyStep.findMany({ where, orderBy: { order: 'asc' } });
    res.json(steps);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch steps' });
  }
});

// GET journey progress for a specific lead (scoped)
router.get('/progress/:leadId', authenticate, async (req, res) => {
  try {
    const hasAccess = await verifyLeadAccess(req.user, req.params.leadId);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const progress = await prisma.journeyProgress.findMany({
      where: { leadId: req.params.leadId },
      include: {
        step: true,
        completedBy: { select: { name: true, avatar: true } }
      },
      orderBy: { step: { order: 'asc' } }
    });
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// POST /toggle — toggle a journey step (scoped to own lead)
router.post('/toggle', authenticate, async (req, res) => {
  try {
    const { leadId, stepId, notes } = req.body;

    const hasAccess = await verifyLeadAccess(req.user, leadId);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const step = await prisma.journeyStep.findUnique({ where: { id: stepId } });
    if (!step) return res.status(404).json({ error: 'Step not found' });

    const existing = await prisma.journeyProgress.findUnique({
      where: { stepId_leadId: { stepId, leadId } }
    });

    if (!existing && step.order > 1) {
      const previousStep = await prisma.journeyStep.findFirst({
        where: { order: step.order - 1, category: step.category }
      });

      if (previousStep) {
        const previousProgress = await prisma.journeyProgress.findUnique({
          where: { stepId_leadId: { stepId: previousStep.id, leadId } }
        });

        if (!previousProgress?.completed) {
          return res.status(403).json({ error: `Complete "${previousStep.label}" before continuing.` });
        }
      }
    }

    let progress;
    let xpGain = 0;

    if (existing) {
      progress = await prisma.journeyProgress.update({
        where: { id: existing.id },
        data: {
          completed: !existing.completed,
          completedAt: !existing.completed ? new Date() : null,
          completedById: !existing.completed ? req.user.id : null,
          notes: notes || existing.notes
        },
        include: { step: true }
      });
      if (!existing.completed) xpGain = 3;
    } else {
      progress = await prisma.journeyProgress.create({
        data: { stepId, leadId, completed: true, completedAt: new Date(), completedById: req.user.id, notes },
        include: { step: true }
      });
      xpGain = 3;
    }

    if (xpGain > 0) {
      await prisma.leaderboard.update({
        where: { userId: req.user.id },
        data: { xp: { increment: xpGain }, monthlyXp: { increment: xpGain }, quarterlyXp: { increment: xpGain } }
      });
      await prisma.leadActivity.create({
        data: { type: 'JOURNEY_STEP', title: `Completed: ${progress.step.label}`, leadId, userId: req.user.id }
      });
    }

    res.json({ progress, xpGain });
  } catch (err) {
    console.error('Toggle journey error:', err);
    res.status(500).json({ error: 'Failed to toggle step' });
  }
});

// POST /journey/steps/add — admin adds a new journey step at the end
router.post('/steps/add', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { label, key, description, category } = req.body;

    if (!label) return res.status(400).json({ error: 'Label is required' });

    const stepCategory = category === 'ADS' ? 'ADS' : 'COMMON';

    // Determine next order within the same category
    const lastStep = await prisma.journeyStep.findFirst({
      where: { category: stepCategory },
      orderBy: { order: 'desc' }
    });
    const nextOrder = (lastStep?.order || 0) + 1;

    // Generate key from label if not provided
    const stepKey = key || label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

    const newStep = await prisma.journeyStep.create({
      data: {
        key: stepKey,
        label,
        description: description || '',
        order: nextOrder,
        category: stepCategory,
        type: 'text'
      }
    });

    const steps = await prisma.journeyStep.findMany({
      where: { category: stepCategory },
      orderBy: { order: 'asc' }
    });
    res.status(201).json({ step: newStep, steps });
  } catch (err) {
    console.error('Add journey step error:', err);
    if (err.code === 'P2002') return res.status(400).json({ error: 'A step with this key already exists' });
    res.status(500).json({ error: 'Failed to add step' });
  }
});

// DELETE /journey/steps/:stepId — admin removes a specific journey step by ID
router.delete('/steps/:stepId', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { stepId } = req.params;

    const step = await prisma.journeyStep.findUnique({ where: { id: stepId } });
    if (!step) return res.status(404).json({ error: 'Step not found' });

    const stepCategory = step.category;

    // Delete any progress records tied to this step
    await prisma.journeyProgress.deleteMany({ where: { stepId } });

    // Delete the step itself
    await prisma.journeyStep.delete({ where: { id: stepId } });

    // Re-order remaining steps within the same category
    const remainingSteps = await prisma.journeyStep.findMany({
      where: { category: stepCategory },
      orderBy: { order: 'asc' }
    });
    for (let i = 0; i < remainingSteps.length; i++) {
      if (remainingSteps[i].order !== i + 1) {
        await prisma.journeyStep.update({
          where: { id: remainingSteps[i].id },
          data: { order: i + 1 }
        });
      }
    }

    const steps = await prisma.journeyStep.findMany({
      where: { category: stepCategory },
      orderBy: { order: 'asc' }
    });
    res.json({ removedStep: step, steps });
  } catch (err) {
    console.error('Remove journey step error:', err);
    res.status(500).json({ error: 'Failed to remove step' });
  }
});

// ─── Journey Step Media (upload, approve, list) ─────────────────────────────

// GET /journey/guides — get all custom guide overrides
router.get('/guides', authenticate, async (req, res) => {
  try {
    const guides = await prisma.journeyGuideCustom.findMany();
    res.json(guides);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch guides' });
  }
});

// PUT /journey/guides/:stepKey — admin edits guide content for a step
router.put('/guides/:stepKey', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { title, summary, example, script } = req.body;
    const guide = await prisma.journeyGuideCustom.upsert({
      where: { stepKey: req.params.stepKey },
      update: { title, summary, example, script, updatedById: req.user.id },
      create: { stepKey: req.params.stepKey, title, summary, example, script, updatedById: req.user.id }
    });
    res.json(guide);
  } catch (err) {
    console.error('Guide update error:', err);
    res.status(500).json({ error: 'Failed to update guide' });
  }
});

// POST /journey/media/:stepKey — admin uploads photo/video for a journey step
router.post('/media/:stepKey', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    let type = 'OTHER';
    if (req.file.mimetype.startsWith('image/')) type = 'IMAGE';
    else if (req.file.mimetype.startsWith('video/')) type = 'VIDEO';

    // Upload to GridFS (MongoDB)
    const { url, fileId } = await uploadToGridFS(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    const media = await prisma.journeyMedia.create({
      data: {
        url,
        originalName: req.file.originalname,
        type,
        size: req.file.size,
        mimeType: req.file.mimetype,
        stepKey: req.params.stepKey,
        uploadedById: req.user.id,
        approved: req.user.role === 'ADMIN' // admin uploads are auto-approved
      }
    });
    res.status(201).json({ media, message: req.user.role === 'ADMIN' ? 'Uploaded successfully.' : 'Uploaded. Waiting for admin approval.' });
  } catch (err) {
    console.error('Journey media upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// GET /journey/media/:stepKey — get approved media for a step (all users)
router.get('/media/:stepKey', authenticate, async (req, res) => {
  try {
    const where = { stepKey: req.params.stepKey };
    // Non-admin only sees approved media
    if (req.user.role !== 'ADMIN') {
      where.approved = true;
    }
    const media = await prisma.journeyMedia.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// GET /journey/media-pending — admin gets all pending media
router.get('/media-pending', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const media = await prisma.journeyMedia.findMany({
      where: { approved: false },
      orderBy: { createdAt: 'desc' }
    });
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending media' });
  }
});

// PUT /journey/media/:id/approve — admin approves media
router.put('/media/:id/approve', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const media = await prisma.journeyMedia.update({
      where: { id: req.params.id },
      data: { approved: true, approvedAt: new Date() }
    });
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve media' });
  }
});

// DELETE /journey/media/:id — admin rejects/deletes media
router.delete('/media/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.journeyMedia.delete({ where: { id: req.params.id } });
    res.json({ message: 'Media deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

export default router;
