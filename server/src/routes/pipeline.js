import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Reusable isolation helper — non-admin users only see their own leads
function ownLeadWhere(user, extra = {}) {
  const base = { deletedAt: { isSet: false }, ...extra };
  if (user.role !== 'ADMIN' && user.role !== 'QUALIFIER') base.assignedToId = user.id;
  return base;
}

// GET /pipeline
router.get('/', authenticate, async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      where: ownLeadWhere(req.user),
      select: {
        id: true, fullName: true, phone: true, company: true, stage: true,
        temperature: true, priority: true, budget: true, updatedAt: true,
        assignedTo: { select: { name: true, avatar: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const stages = [
      'CONNECT','REPLY','INTEREST','TRUST','TRIAL',
      'DEMO_BOOKED','DEMO_ATTENDED','PROPOSAL_SENT','NEGOTIATION','WON','LOST'
    ];
    const pipeline = {};
    stages.forEach(s => { pipeline[s] = []; });
    leads.forEach(l => { if (pipeline[l.stage]) pipeline[l.stage].push(l); });

    res.json(pipeline);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pipeline' });
  }
});

// PUT /pipeline/move/:id  — sales exec can only move their own leads
router.put('/move/:id', authenticate, async (req, res) => {
  try {
    const { stage } = req.body;

    const existing = await prisma.lead.findFirst({
      where: ownLeadWhere(req.user, { id: req.params.id })
    });
    if (!existing) return res.status(404).json({ error: 'Lead not found or access denied' });

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { stage }
    });

    await prisma.leadActivity.create({
      data: {
        type: 'STAGE_CHANGE',
        title: `Pipeline: ${existing.stage} → ${stage}`,
        leadId: lead.id,
        userId: req.user.id
      }
    });

    const xp = stage === 'WON' ? 50 : 10;
    await prisma.leaderboard.update({
      where: { userId: req.user.id },
      data: { xp: { increment: xp }, monthlyXp: { increment: xp }, quarterlyXp: { increment: xp } }
    });

    res.json({ lead, xpGain: xp });
  } catch (err) {
    res.status(500).json({ error: 'Failed to move lead' });
  }
});

export default router;
