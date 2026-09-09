import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { uploadToGridFS, deleteFromGridFS } from '../config/gridfs.js';
import { resolveLatLngFromMapsLink } from '../utils/geo.js';

const router = Router();

const claimSelect = {
  id: true,
  title: true,
  description: true,
  dueDate: true,
  completed: true,
  completedAt: true,
  priority: true,
  pooled: true,
  claimedAt: true,
  createdAt: true,
  userId: true,
  createdById: true,
  projectName: true,
  photoUrl: true,
  locationLink: true,
  latitude: true,
  longitude: true,
  opportunityId: true,
  user: { select: { id: true, name: true, avatar: true } },
  createdBy: { select: { id: true, name: true, avatar: true } }
};

// Task fields shown as chips inside an opportunity card.
const taskChipSelect = {
  id: true,
  title: true,
  completed: true,
  completedAt: true,
  claimedAt: true,
  userId: true,
  user: { select: { id: true, name: true, avatar: true } }
};

// A full opportunity (project) with its claimable tasks.
const opportunitySelect = {
  id: true,
  projectName: true,
  address: true,
  description: true,
  priority: true,
  photoUrl: true,
  locationLink: true,
  latitude: true,
  longitude: true,
  createdAt: true,
  createdById: true,
  createdBy: { select: { id: true, name: true, avatar: true } },
  tasks: { select: taskChipSelect, orderBy: { createdAt: 'asc' } }
};

// Normalize an opportunity into a unified pool "card".
const oppToCard = (o) => ({ ...o, type: 'opportunity' });

// A lead that has pooled tasks, shaped like an opportunity card so the client
// can render and claim it the same way.
const leadCardSelect = {
  id: true,
  fullName: true,
  company: true,
  location: true,
  priority: true,
  locationLink: true,
  latitude: true,
  longitude: true,
  createdAt: true,
  tasks: {
    where: { pooled: true },
    select: taskChipSelect,
    orderBy: { createdAt: 'asc' }
  }
};

const leadToCard = (l) => ({
  type: 'lead',
  id: l.id,
  projectName: l.fullName,          // reuse card fields
  address: [l.company, l.location].filter(Boolean).join(' · ') || null,
  priority: l.priority,
  photoUrl: null,
  locationLink: l.locationLink,
  latitude: l.latitude,
  longitude: l.longitude,
  createdAt: l.createdAt,
  tasks: l.tasks
});

// Fetch leads that have pooled tasks, filtered by claim state.
// state: 'open' -> some task unclaimed; 'initiated' -> some task claimed.
async function fetchLeadCards(state) {
  const taskCond = state === 'initiated' ? { userId: { not: null } } : { userId: null };
  const leads = await prisma.lead.findMany({
    where: {
      deletedAt: { isSet: false },
      tasks: { some: { pooled: true, ...taskCond } }
    },
    orderBy: [{ createdAt: 'desc' }],
    select: leadCardSelect
  });
  // Only keep leads that actually have pooled tasks.
  return leads.filter(l => (l.tasks || []).length > 0).map(leadToCard);
}

// ---------------------------------------------------------------------------
// Personal tasks (classic flow) — a user's own tasks, including any they claimed.
// ---------------------------------------------------------------------------
router.get('/', authenticate, async (req, res) => {
  try {
    const { completed } = req.query;
    const where = { userId: req.user.id };
    if (completed !== undefined) where.completed = completed === 'true';
    const tasks = await prisma.task.findMany({ where, orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }] });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// ---------------------------------------------------------------------------
// Shared opportunity pool.
// GET /tasks/pool/open      -> opportunities that still have unclaimed tasks
// GET /tasks/pool/initiated -> opportunities where at least one task is claimed
// ---------------------------------------------------------------------------
router.get('/pool/open', authenticate, async (req, res) => {
  try {
    const [opportunities, leadCards] = await Promise.all([
      prisma.opportunity.findMany({
        where: { tasks: { some: { userId: null } } },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        select: opportunitySelect
      }),
      fetchLeadCards('open')
    ]);
    res.json([...opportunities.map(oppToCard), ...leadCards]);
  } catch (err) {
    console.error('pool/open error:', err);
    res.status(500).json({ error: 'Failed to fetch open opportunities' });
  }
});

// Opportunities that have at least one claimed task — visible to everyone so
// the team can see which projects are already being worked on.
router.get('/pool/initiated', authenticate, async (req, res) => {
  try {
    const [opportunities, leadCards] = await Promise.all([
      prisma.opportunity.findMany({
        where: { tasks: { some: { userId: { not: null } } } },
        orderBy: [{ createdAt: 'desc' }],
        select: opportunitySelect
      }),
      fetchLeadCards('initiated')
    ]);
    res.json([...opportunities.map(oppToCard), ...leadCards]);
  } catch (err) {
    console.error('pool/initiated error:', err);
    res.status(500).json({ error: 'Failed to fetch initiated opportunities' });
  }
});

// Current user's claimed tasks (flat list).
router.get('/pool/claimed', authenticate, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { pooled: true, userId: req.user.id },
      orderBy: [{ completed: 'asc' }, { claimedAt: 'desc' }],
      select: claimSelect
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch claimed tasks' });
  }
});

// Admin-only: every opportunity with all tasks.
router.get('/pool/all', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const opportunities = await prisma.opportunity.findMany({
      orderBy: [{ createdAt: 'desc' }],
      select: opportunitySelect
    });
    res.json(opportunities);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pool opportunities' });
  }
});

// ---------------------------------------------------------------------------
// Leads inside the Tasks section.
// GET /tasks/leads -> ALL leads (visible to every authenticated user) with
// their attached tasks. Leads whose tasks are all completed sort to the
// bottom; leads with pending (or no) tasks stay on top.
// ---------------------------------------------------------------------------
const leadTaskSelect = {
  id: true,
  title: true,
  completed: true,
  completedAt: true,
  priority: true,
  createdAt: true,
  userId: true,
  user: { select: { id: true, name: true, avatar: true } }
};

router.get('/leads', authenticate, async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      where: { deletedAt: { isSet: false } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        phone: true,
        company: true,
        location: true,
        locationLink: true,
        latitude: true,
        longitude: true,
        priority: true,
        stage: true,
        status: true,
        temperature: true,
        createdAt: true,
        assignedTo: { select: { id: true, name: true, avatar: true } },
        tasks: { select: leadTaskSelect, orderBy: [{ completed: 'asc' }, { createdAt: 'asc' }] }
      }
    });

    // A lead is "done" (sinks to the bottom) when it has at least one task and
    // every task is completed. Leads with pending tasks — or no tasks yet —
    // stay on top. Stable within each group by newest first.
    const withState = leads.map(l => {
      const total = l.tasks.length;
      const done = l.tasks.filter(t => t.completed).length;
      const allDone = total > 0 && done === total;
      return { ...l, taskTotal: total, taskDone: done, allDone };
    });

    withState.sort((a, b) => {
      if (a.allDone !== b.allDone) return a.allDone ? 1 : -1; // pending first
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(withState);
  } catch (err) {
    console.error('tasks/leads error:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Admin: add one or more tasks to a specific lead.
router.post('/lead/:leadId', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.leadId } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // Accept a single title or an array of titles.
    let titles = [];
    if (Array.isArray(req.body.titles)) titles = req.body.titles;
    else if (req.body.title) titles = [req.body.title];
    titles = titles.map(t => (typeof t === 'string' ? t.trim() : '')).filter(Boolean);
    if (titles.length === 0) return res.status(400).json({ error: 'At least one task is required' });

    const priority = req.body.priority || lead.priority || 'MEDIUM';

    await prisma.task.createMany({
      data: titles.map(title => ({
        title,
        priority,
        leadId: lead.id,
        createdById: req.user.id,
        // Lead tasks join the claim pool so team members can claim the lead.
        pooled: true,
        userId: null,
        // Mirror lead location so distance shows on the claimable card.
        latitude: lead.latitude ?? null,
        longitude: lead.longitude ?? null,
        locationLink: lead.locationLink ?? null
      }))
    });

    const tasks = await prisma.task.findMany({
      where: { leadId: lead.id },
      select: leadTaskSelect,
      orderBy: [{ completed: 'asc' }, { createdAt: 'asc' }]
    });
    res.status(201).json({ leadId: lead.id, tasks });
  } catch (err) {
    console.error('Create lead task error:', err);
    res.status(500).json({ error: 'Failed to add task to lead' });
  }
});

// Toggle completion of a lead task (visible to all users so the team can work
// leads together). Returns the updated task.
router.put('/lead-task/:id', authenticate, async (req, res) => {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing || !existing.leadId) return res.status(404).json({ error: 'Task not found' });

    const completed = req.body.completed === true || req.body.completed === 'true';
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: { completed, completedAt: completed ? new Date() : null },
      select: leadTaskSelect
    });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Admin: delete a lead task.
router.delete('/lead-task/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing || !existing.leadId) return res.status(404).json({ error: 'Task not found' });
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Claim a lead — assigns every currently-unclaimed task on the lead to the
// current user in one action (mirrors opportunity claim).
router.post('/lead/:leadId/claim', authenticate, async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.leadId } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const unclaimed = await prisma.task.count({ where: { leadId: lead.id, userId: null } });
    if (unclaimed === 0) return res.status(409).json({ error: 'Lead already claimed' });

    await prisma.task.updateMany({
      where: { leadId: lead.id, userId: null },
      data: { userId: req.user.id, claimedAt: new Date() }
    });

    const tasks = await prisma.task.findMany({
      where: { leadId: lead.id },
      select: leadTaskSelect,
      orderBy: [{ completed: 'asc' }, { createdAt: 'asc' }]
    });
    res.json({ leadId: lead.id, tasks });
  } catch (err) {
    console.error('Lead claim error:', err);
    res.status(500).json({ error: 'Failed to claim lead' });
  }
});

// ---------------------------------------------------------------------------
// Create a personal task (any authenticated user). JSON body.
// ---------------------------------------------------------------------------
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, dueDate, priority } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 'MEDIUM',
        userId: req.user.id
      }
    });
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// ---------------------------------------------------------------------------
// Admin: create a pooled opportunity task. Accepts multipart/form-data so a
// site photo can be uploaded. Fields: title, projectName, priority,
// locationLink (Google Maps URL), description, dueDate. Optional file: photo.
// ---------------------------------------------------------------------------
router.post('/pool', authenticate, authorize('ADMIN'), upload.single('photo'), async (req, res) => {
  try {
    const { projectName, address, description, priority, locationLink } = req.body;

    // Accept the task list as a JSON array string, a repeated field, or a
    // single "title" (backwards compatible).
    let titles = [];
    if (req.body.titles) {
      try {
        const parsed = typeof req.body.titles === 'string' ? JSON.parse(req.body.titles) : req.body.titles;
        if (Array.isArray(parsed)) titles = parsed;
      } catch {
        titles = Array.isArray(req.body.titles) ? req.body.titles : [req.body.titles];
      }
    } else if (req.body.title) {
      titles = [req.body.title];
    }

    titles = titles.map(t => (typeof t === 'string' ? t.trim() : '')).filter(Boolean);
    if (titles.length === 0) return res.status(400).json({ error: 'At least one task is required' });
    if (!projectName || !projectName.trim()) return res.status(400).json({ error: 'Project name is required' });

    // Parse coordinates from the pasted maps link, expanding short links
    // (maps.app.goo.gl) when needed so the distance can be shown.
    const coords = await resolveLatLngFromMapsLink(locationLink);

    // Upload the photo to GridFS if provided (once, shared by the opportunity).
    let photoUrl = null;
    let photoFileId = null;
    if (req.file && req.file.mimetype?.startsWith('image/')) {
      const { url, fileId } = await uploadToGridFS(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
      photoUrl = url;
      photoFileId = fileId;
    }

    const prio = priority || 'MEDIUM';

    // Create the opportunity (project) and its tasks together.
    const opportunity = await prisma.opportunity.create({
      data: {
        projectName: projectName.trim(),
        address: address?.trim() || null,
        description: description?.trim() || null,
        priority: prio,
        locationLink: locationLink?.trim() || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        photoUrl,
        photoFileId,
        createdById: req.user.id,
        tasks: {
          create: titles.map(title => ({
            title,
            priority: prio,
            pooled: true,
            userId: null,
            createdById: req.user.id,
            // Mirror project metadata onto the task for the flat "claimed" view.
            projectName: projectName.trim(),
            photoUrl,
            locationLink: locationLink?.trim() || null,
            latitude: coords?.lat ?? null,
            longitude: coords?.lng ?? null
          }))
        }
      },
      select: opportunitySelect
    });

    res.status(201).json(opportunity);
  } catch (err) {
    console.error('Pool opportunity create error:', err);
    res.status(500).json({ error: 'Failed to create opportunity' });
  }
});

// Claim an entire opportunity (project) — assigns every currently-unclaimed
// task in it to the current user in one action.
router.post('/pool/opportunity/:id/claim', authenticate, async (req, res) => {
  try {
    const opp = await prisma.opportunity.findUnique({
      where: { id: req.params.id },
      include: { tasks: true }
    });
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });

    const unclaimed = opp.tasks.filter(t => !t.userId);
    if (unclaimed.length === 0) {
      return res.status(409).json({ error: 'Project already claimed' });
    }

    // Assign all unclaimed tasks in this opportunity to the user at once.
    await prisma.task.updateMany({
      where: { opportunityId: opp.id, userId: null },
      data: { userId: req.user.id, claimedAt: new Date() }
    });

    const updated = await prisma.opportunity.findUnique({
      where: { id: opp.id },
      select: opportunitySelect
    });
    res.json(updated);
  } catch (err) {
    console.error('Opportunity claim error:', err);
    res.status(500).json({ error: 'Failed to claim project' });
  }
});

// Admin: delete an entire opportunity (project) and all of its tasks.
router.delete('/pool/opportunity/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const opp = await prisma.opportunity.findUnique({ where: { id: req.params.id } });
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });

    await prisma.task.deleteMany({ where: { opportunityId: opp.id } });
    if (opp.photoFileId) await deleteFromGridFS(opp.photoFileId);
    await prisma.opportunity.delete({ where: { id: opp.id } });

    res.json({ message: 'Opportunity deleted' });
  } catch (err) {
    console.error('Opportunity delete error:', err);
    res.status(500).json({ error: 'Failed to delete opportunity' });
  }
});

// ---------------------------------------------------------------------------
// Claim an open pooled task. Uses a conditional updateMany so two users
// racing to claim the same task can't both succeed.
// ---------------------------------------------------------------------------
router.post('/:id/claim', authenticate, async (req, res) => {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing || !existing.pooled) return res.status(404).json({ error: 'Task not found' });
    if (existing.userId) return res.status(409).json({ error: 'Task already claimed' });

    const result = await prisma.task.updateMany({
      where: { id: req.params.id, pooled: true, userId: null },
      data: { userId: req.user.id, claimedAt: new Date() }
    });

    if (result.count === 0) {
      return res.status(409).json({ error: 'Task already claimed' });
    }

    const task = await prisma.task.findUnique({ where: { id: req.params.id }, select: claimSelect });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to claim task' });
  }
});

// Release a claimed pooled task back to the open pool (owner or admin).
router.post('/:id/release', authenticate, async (req, res) => {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing || !existing.pooled) return res.status(404).json({ error: 'Task not found' });
    if (existing.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: { userId: null, claimedAt: null, completed: false, completedAt: null },
      select: claimSelect
    });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to release task' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const data = req.body;
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    // Ownership check — users can only modify their own tasks.
    // Admins may edit pooled tasks they created.
    const isOwner = existing.userId && existing.userId === req.user.id;
    const isPoolAdmin = existing.pooled && req.user.role === 'ADMIN';
    if (!isOwner && !isPoolAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Never allow reassigning ownership or pool status through a generic update.
    delete data.userId;
    delete data.createdById;
    delete data.pooled;
    delete data.claimedAt;

    const shouldAwardXp = data.completed === true && !existing.completed;

    if (data.completed && !data.completedAt) data.completedAt = new Date();
    if (data.completed === false) data.completedAt = null;

    const task = await prisma.task.update({ where: { id: req.params.id }, data });

    if (shouldAwardXp) {
      await prisma.leaderboard.upsert({
        where: { userId: req.user.id },
        update: { xp: { increment: 5 }, monthlyXp: { increment: 5 }, quarterlyXp: { increment: 5 } },
        create: { userId: req.user.id, xp: 5, monthlyXp: 5, quarterlyXp: 5, streak: 1 }
      });
      return res.json({ ...task, xpGain: 5 });
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    // Personal task owner, or admin managing a pooled task.
    const isOwner = existing.userId && existing.userId === req.user.id;
    const isPoolAdmin = existing.pooled && req.user.role === 'ADMIN';
    if (!isOwner && !isPoolAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (existing.photoFileId) {
      await deleteFromGridFS(existing.photoFileId);
    }

    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
