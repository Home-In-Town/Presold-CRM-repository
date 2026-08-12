import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Helper: build role-based where clause — non-admin users ONLY see their own leads
function roleWhere(user) {
  if (user.role === 'ADMIN' || user.role === 'QUALIFIER') {
    return { deletedAt: { isSet: false } };
  }
  // All other roles only see their own leads
  return { deletedAt: { isSet: false }, assignedToId: user.id };
}

// GET /leads/assignable-users — admin/qualifier gets list of active users for assignment dropdown
router.get('/assignable-users', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'QUALIFIER') return res.status(403).json({ error: 'Not allowed' });
    const users = await prisma.user.findMany({
      where: { isActive: true, role: { not: 'ADMIN' } },
      select: { id: true, name: true, email: true, role: true, avatar: true },
      orderBy: { name: 'asc' }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /leads — list with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1, limit = 50,
      search, stage, temperature, status, priority, source,
      assignedTo, period,
      sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Base filter locked by role — sales exec cannot override this
    const where = roleWhere(req.user);

    // Admin/Qualifier can additionally filter by assignedTo
    if (assignedTo && (req.user.role === 'ADMIN' || req.user.role === 'QUALIFIER')) {
      where.assignedToId = assignedTo;
    }

    // Period filter (from dashboard cards)
    if (period === 'today') {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      where.createdAt = { gte: today };
    } else if (period === 'week') {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      where.createdAt = { gte: weekAgo };
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (stage)       where.stage       = stage;
    if (temperature) where.temperature = temperature;
    if (status)      where.status      = status;
    if (priority)    where.priority    = priority;
    if (source)      where.source      = source;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          assignedTo: { select: { id: true, name: true, avatar: true } },
          journeyProgress: { where: { completed: true } },
          _count: { select: { notes: true, files: true, activities: true } }
        }
      }),
      prisma.lead.count({ where })
    ]);

    // Populate createdBy name for leads that have createdById
    const creatorIds = [...new Set(leads.filter(l => l.createdById).map(l => l.createdById))];
    let creatorsMap = {};
    if (creatorIds.length > 0) {
      const creators = await prisma.user.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, name: true }
      });
      creatorsMap = Object.fromEntries(creators.map(c => [c.id, c.name]));
    }
    const leadsWithCreator = leads.map(l => ({
      ...l,
      createdByName: l.createdById ? (creatorsMap[l.createdById] || null) : (l.assignedTo?.name || null)
    }));

    res.json({
      leads: leadsWithCreator,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    console.error('Get leads error:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET /leads/:id — single lead (non-admin can only view their own)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const where = { id: req.params.id };
    // Enforce ownership for non-admin and non-qualifier
    if (req.user.role !== 'ADMIN' && req.user.role !== 'QUALIFIER') {
      where.assignedToId = req.user.id;
    }

    const lead = await prisma.lead.findFirst({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true, email: true } },
        notes: { orderBy: { createdAt: 'desc' } },
        activities: {
          orderBy: { createdAt: 'desc' }, take: 50,
          include: { user: { select: { name: true, avatar: true } } }
        },
        files: { where: { deletedAt: { isSet: false } } },
        journeyProgress: {
          include: {
            step: true,
            completedBy: { select: { name: true } }
          }
        }
      }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found or access denied' });
    }
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// POST /leads — create (auto-assigned to current user)
router.post('/', authenticate, async (req, res) => {
  try {
    const { fullName, phone, email, company, location, budget, timeline, source, temperature, priority, leadType, adsRunning, notes } = req.body;
    if (!fullName || !phone) return res.status(400).json({ error: 'Name and phone required' });

    const lead = await prisma.lead.create({
      data: {
        fullName, phone, email, company, location, budget, timeline,
        leadType: leadType || 'INDIVIDUAL',
        source: source || 'INSTAGRAM_DM',
        temperature: temperature || 'WARM',
        priority: priority || 'MEDIUM',
        adsRunning: adsRunning || false,
        assignedToId: req.user.id,
        createdById: req.user.id   // permanent — never changes even if lead is reassigned
      },
      include: { assignedTo: { select: { id: true, name: true, avatar: true } } }
    });

    await prisma.leadActivity.create({
      data: { type: 'CREATED', title: 'Lead created', leadId: lead.id, userId: req.user.id }
    });

    if (notes) {
      await prisma.leadNote.create({ data: { content: notes, leadId: lead.id } });
    }

    await prisma.leaderboard.update({
      where: { userId: req.user.id },
      data: { xp: { increment: 5 }, monthlyXp: { increment: 5 }, quarterlyXp: { increment: 5 } }
    });

    res.status(201).json(lead);
  } catch (err) {
    console.error('Create lead error:', err);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// PUT /leads/:id — update (sales exec can only update their own)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Ownership check
    const existing = await prisma.lead.findFirst({
      where: req.user.role !== 'ADMIN'
        ? { id, assignedToId: req.user.id }
        : { id }
    });
    if (!existing) return res.status(404).json({ error: 'Lead not found or access denied' });

    let xpGain = 0;
    if (data.stage && data.stage !== existing.stage) {
      await prisma.leadActivity.create({
        data: { type: 'STAGE_CHANGE', title: `Stage: ${existing.stage} → ${data.stage}`, leadId: id, userId: req.user.id }
      });
      xpGain = data.stage === 'WON' ? 50 : 10;
    }
    if (data.status && data.status !== existing.status) {
      await prisma.leadActivity.create({
        data: { type: 'STATUS_CHANGE', title: `Status: ${existing.status} → ${data.status}`, leadId: id, userId: req.user.id }
      });
    }

    // Non-admin cannot reassign leads
    if (req.user.role !== 'ADMIN') delete data.assignedToId;

    const lead = await prisma.lead.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true } },
        journeyProgress: { where: { completed: true } }
      }
    });

    if (xpGain > 0) {
      await prisma.leaderboard.update({
        where: { userId: req.user.id },
        data: { xp: { increment: xpGain }, monthlyXp: { increment: xpGain }, quarterlyXp: { increment: xpGain } }
      });
    }

    res.json({ lead, xpGain });
  } catch (err) {
    console.error('Update lead error:', err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// DELETE /leads/:id (sales exec can only delete their own)
// DELETE /leads/:id (non-admin can only delete their own)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const where = req.user.role !== 'ADMIN'
      ? { id: req.params.id, assignedToId: req.user.id }
      : { id: req.params.id };

    const existing = await prisma.lead.findFirst({ where });
    if (!existing) return res.status(404).json({ error: 'Lead not found or access denied' });

    await prisma.lead.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// POST /leads/:id/notes
router.post('/:id/notes', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    // verify access
    const lead = await prisma.lead.findFirst({
      where: req.user.role !== 'ADMIN'
        ? { id: req.params.id, assignedToId: req.user.id }
        : { id: req.params.id }
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found or access denied' });

    const note = await prisma.leadNote.create({ data: { content, leadId: req.params.id } });
    await prisma.leadActivity.create({
      data: { type: 'NOTE_ADDED', title: 'Note added', leadId: req.params.id, userId: req.user.id }
    });
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// Bulk delete — admin only
router.post('/bulk/delete', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Not allowed' });
    const { ids } = req.body;
    await prisma.lead.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } });
    res.json({ message: `${ids.length} leads deleted` });
  } catch (err) {
    res.status(500).json({ error: 'Bulk delete failed' });
  }
});

// Bulk assign — admin only
router.post('/bulk/assign', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Not allowed' });
    const { ids, assignedToId } = req.body;
    await prisma.lead.updateMany({ where: { id: { in: ids } }, data: { assignedToId } });
    res.json({ message: `${ids.length} leads assigned` });
  } catch (err) {
    res.status(500).json({ error: 'Bulk assign failed' });
  }
});

// PUT /leads/:id/assign — admin/qualifier assigns a lead to a specific user
router.put('/:id/assign', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'QUALIFIER') return res.status(403).json({ error: 'Not allowed' });
    const { assignedToId } = req.body;
    if (!assignedToId) return res.status(400).json({ error: 'assignedToId is required' });

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { assignedToId },
      include: { assignedTo: { select: { id: true, name: true, avatar: true } } }
    });

    await prisma.leadActivity.create({
      data: { type: 'ASSIGNED', title: `Lead assigned to ${lead.assignedTo?.name || 'user'}`, leadId: lead.id, userId: req.user.id }
    });

    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign lead' });
  }
});

// PUT /leads/:id/qualify — QUALIFIER or ADMIN can qualify/unqualify a lead
router.put('/:id/qualify', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'QUALIFIER') {
      return res.status(403).json({ error: 'Not allowed' });
    }
    const { qualified } = req.body; // 'QUALIFIED', 'UNQUALIFIED', or 'PENDING'
    if (!['QUALIFIED', 'UNQUALIFIED', 'PENDING'].includes(qualified)) {
      return res.status(400).json({ error: 'Invalid status. Use QUALIFIED, UNQUALIFIED, or PENDING' });
    }

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        qualified,
        qualifiedBy: req.user.name,
        qualifiedAt: new Date()
      }
    });

    await prisma.leadActivity.create({
      data: {
        type: 'QUALIFIED',
        title: `Lead marked as ${qualified} by ${req.user.name}`,
        leadId: lead.id,
        userId: req.user.id
      }
    });

    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: 'Failed to qualify lead' });
  }
});

export default router;
