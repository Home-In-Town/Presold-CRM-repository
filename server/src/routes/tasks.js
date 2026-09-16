import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { uploadToGridFS, deleteFromGridFS } from '../config/gridfs.js';
import { resolveLatLngFromMapsLink } from '../utils/geo.js';

const router = Router();

// Valid functional team values (also used on client).
export const TASK_TEAMS = ['ALL', 'SALES_TEAM', 'B2B_SALES', 'CONTENT_TEAM'];

// ---------------------------------------------------------------------------
// Shared select objects — taskTeam is now included everywhere.
// ---------------------------------------------------------------------------

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
  taskTeam: true,
  user: { select: { id: true, name: true, avatar: true } },
  createdBy: { select: { id: true, name: true, avatar: true } }
};

// Task fields shown as chips inside a card.
const taskChipSelect = {
  id: true,
  title: true,
  completed: true,
  completedAt: true,
  claimedAt: true,
  userId: true,
  taskTeam: true,
  user: { select: { id: true, name: true, avatar: true, functionalTeam: true } }
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

// A lead that has pooled tasks, shaped like an opportunity card.
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
  projectName: l.fullName,
  address: [l.company, l.location].filter(Boolean).join(' · ') || null,
  priority: l.priority,
  photoUrl: null,
  locationLink: l.locationLink,
  latitude: l.latitude,
  longitude: l.longitude,
  createdAt: l.createdAt,
  tasks: l.tasks
});

// Build a task filter for "which tasks can this user see" based on their
// functionalTeam. Admins and ALL-team users see everything.
function taskTeamFilter(user) {
  const ft = user.functionalTeam || 'ALL';
  if (user.role === 'ADMIN' || ft === 'ALL') return undefined; // no extra filter
  return { OR: [{ taskTeam: 'ALL' }, { taskTeam: ft }, { taskTeam: null }] };
}

// Fetch leads that have pooled tasks, filtered by claim state.
// The `user` argument is used to filter tasks by team visibility.
async function fetchLeadCards(state, user) {
  const taskCond = state === 'initiated' ? { userId: { not: null } } : { userId: null };
  const ft = user?.functionalTeam || 'ALL';
  const teamCond = (user?.role === 'ADMIN' || ft === 'ALL')
    ? {}
    : { OR: [{ taskTeam: 'ALL' }, { taskTeam: ft }, { taskTeam: null }] };

  const leads = await prisma.lead.findMany({
    where: {
      deletedAt: { isSet: false },
      tasks: { some: { pooled: true, ...taskCond } }
    },
    orderBy: [{ createdAt: 'desc' }],
    select: {
      ...leadCardSelect,
      tasks: {
        where: { pooled: true, ...teamCond },
        select: taskChipSelect,
        orderBy: { createdAt: 'asc' }
      }
    }
  });
  return leads.filter(l => (l.tasks || []).length > 0).map(leadToCard);
}

// ---------------------------------------------------------------------------
// Personal tasks (classic flow).
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
// ---------------------------------------------------------------------------
router.get('/pool/open', authenticate, async (req, res) => {
  try {
    const teamFilter = taskTeamFilter(req.user);
    const oppTasksSelect = teamFilter
      ? { ...taskChipSelect }
      : taskChipSelect;

    const [rawOpportunities, leadCards] = await Promise.all([
      prisma.opportunity.findMany({
        where: { tasks: { some: { userId: null } } },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        select: {
          ...opportunitySelect,
          tasks: {
            where: teamFilter ? { ...teamFilter } : undefined,
            select: taskChipSelect,
            orderBy: { createdAt: 'asc' }
          }
        }
      }),
      fetchLeadCards('open', req.user)
    ]);

    // Filter out opportunities that have no visible tasks for this user's team.
    const opportunities = rawOpportunities.filter(o => (o.tasks || []).length > 0);
    res.json([...opportunities.map(oppToCard), ...leadCards]);
  } catch (err) {
    console.error('pool/open error:', err);
    res.status(500).json({ error: 'Failed to fetch open opportunities' });
  }
});

router.get('/pool/initiated', authenticate, async (req, res) => {
  try {
    const teamFilter = taskTeamFilter(req.user);
    const [rawOpportunities, leadCards] = await Promise.all([
      prisma.opportunity.findMany({
        where: { tasks: { some: { userId: { not: null } } } },
        orderBy: [{ createdAt: 'desc' }],
        select: {
          ...opportunitySelect,
          tasks: {
            where: teamFilter ? { ...teamFilter } : undefined,
            select: taskChipSelect,
            orderBy: { createdAt: 'asc' }
          }
        }
      }),
      fetchLeadCards('initiated', req.user)
    ]);
    const opportunities = rawOpportunities.filter(o => (o.tasks || []).length > 0);
    res.json([...opportunities.map(oppToCard), ...leadCards]);
  } catch (err) {
    console.error('pool/initiated error:', err);
    res.status(500).json({ error: 'Failed to fetch initiated opportunities' });
  }
});

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

// ---------------------------------------------------------------------------
// GET /tasks/pool/claimed/all
// All claimed tasks across the entire team — visible to every authenticated user.
// Groups by lead (or opportunity) and shows the claimer with their team name.
// ---------------------------------------------------------------------------
router.get('/pool/claimed/all', authenticate, async (req, res) => {
  try {
    // Claimed lead tasks (pooled = true, userId is set)
    const leadTasks = await prisma.task.findMany({
      where: { pooled: true, userId: { not: null }, leadId: { not: null } },
      orderBy: [{ claimedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        completed: true,
        completedAt: true,
        claimedAt: true,
        taskTeam: true,
        leadId: true,
        userId: true,
        user: { select: { id: true, name: true, avatar: true, functionalTeam: true } },
        lead: {
          select: {
            id: true,
            fullName: true,
            company: true,
            location: true,
            priority: true,
            files: {
              where: { mimeType: { startsWith: 'image/' }, deletedAt: { isSet: false } },
              select: { url: true },
              take: 1
            }
          }
        }
      }
    });

    // Claimed opportunity tasks
    const oppTasks = await prisma.task.findMany({
      where: { pooled: true, userId: { not: null }, opportunityId: { not: null } },
      orderBy: [{ claimedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        completed: true,
        completedAt: true,
        claimedAt: true,
        taskTeam: true,
        opportunityId: true,
        projectName: true,
        photoUrl: true,
        userId: true,
        user: { select: { id: true, name: true, avatar: true, functionalTeam: true } },
        opportunity: {
          select: {
            id: true,
            projectName: true,
            address: true,
            priority: true,
            photoUrl: true
          }
        }
      }
    });

    res.json({ leadTasks, oppTasks });
  } catch (err) {
    console.error('pool/claimed/all error:', err);
    res.status(500).json({ error: 'Failed to fetch all claimed tasks' });
  }
});

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
// Leads inside the Tasks section — with team-based task filtering.
// ---------------------------------------------------------------------------
const leadTaskSelect = {
  id: true,
  title: true,
  completed: true,
  completedAt: true,
  priority: true,
  createdAt: true,
  userId: true,
  taskTeam: true,
  user: { select: { id: true, name: true, avatar: true, functionalTeam: true } }
};

router.get('/leads', authenticate, async (req, res) => {
  try {
    // ALL tasks on every lead are visible to every authenticated user.
    // Team filtering only applies to the pool (open/initiated) views.
    const leads = await prisma.lead.findMany({
      where: { deletedAt: { isSet: false } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        company: true,
        location: true,
        locationLink: true,
        latitude: true,
        longitude: true,
        priority: true,
        stage: true,
        status: true,
        temperature: true,
        budget: true,
        source: true,
        createdAt: true,
        assignedTo: { select: { id: true, name: true, avatar: true } },
        tasks: {
          select: leadTaskSelect,
          orderBy: [{ completed: 'asc' }, { createdAt: 'asc' }]
        },
        files: {
          where: { mimeType: { startsWith: 'image/' }, deletedAt: { isSet: false } },
          select: { url: true },
          orderBy: { createdAt: 'asc' },
          take: 1
        }
      }
    });

    const withState = leads.map(l => {
      const total = l.tasks.length;
      const done = l.tasks.filter(t => t.completed).length;
      const allDone = total > 0 && done === total;
      return { ...l, taskTotal: total, taskDone: done, allDone };
    });

    withState.sort((a, b) => {
      if (a.allDone !== b.allDone) return a.allDone ? 1 : -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(withState);
  } catch (err) {
    console.error('tasks/leads error:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// ---------------------------------------------------------------------------
// Admin: add one or more tasks to a lead.
// Now accepts optional `taskTeam` per task (or a single value for all tasks).
// Body: { titles: string[], taskTeam?: string | string[], priority?: string }
// ---------------------------------------------------------------------------
router.post('/lead/:leadId', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.leadId } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // titles can be an array of strings OR an array of {title, taskTeam} objects.
    let rawTitles = [];
    if (Array.isArray(req.body.titles)) rawTitles = req.body.titles;
    else if (req.body.title) rawTitles = [req.body.title];

    // Normalise: each item becomes { title, taskTeam }
    const taskEntries = rawTitles
      .map(item => {
        if (typeof item === 'string') {
          return { title: item.trim(), taskTeam: req.body.taskTeam || 'ALL' };
        }
        if (item && typeof item === 'object') {
          return {
            title: (item.title || '').trim(),
            taskTeam: item.taskTeam || req.body.taskTeam || 'ALL'
          };
        }
        return null;
      })
      .filter(e => e && e.title);

    if (taskEntries.length === 0) return res.status(400).json({ error: 'At least one task is required' });

    const priority = req.body.priority || lead.priority || 'MEDIUM';

    await prisma.task.createMany({
      data: taskEntries.map(({ title, taskTeam }) => ({
        title,
        priority,
        leadId: lead.id,
        createdById: req.user.id,
        pooled: true,
        userId: null,
        latitude: lead.latitude ?? null,
        longitude: lead.longitude ?? null,
        locationLink: lead.locationLink ?? null,
        taskTeam: TASK_TEAMS.includes(taskTeam) ? taskTeam : 'ALL'
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

// Toggle completion of a lead task.
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

// Claim the tasks on a lead that belong to the current user's functional team.
// If the user's team is ALL (or ADMIN), claim all unclaimed tasks.
// This lets each team claim their own tasks independently.
router.post('/lead/:leadId/claim', authenticate, async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.leadId } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const ft = req.user.functionalTeam || 'ALL';
    const isAllTeam = req.user.role === 'ADMIN' || ft === 'ALL';

    // Build which tasks this user can claim: unclaimed + matching their team
    const claimWhere = {
      leadId: lead.id,
      userId: null,
      ...(isAllTeam ? {} : {
        OR: [{ taskTeam: 'ALL' }, { taskTeam: ft }, { taskTeam: null }]
      })
    };

    const unclaimed = await prisma.task.count({ where: claimWhere });
    if (unclaimed === 0) {
      return res.status(409).json({ error: 'No unclaimed tasks available for your team' });
    }

    await prisma.task.updateMany({
      where: claimWhere,
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
// Create a personal task.
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
// Admin: create a pooled opportunity.
// Now accepts `taskTeams` — a JSON array parallel to `titles`, one taskTeam
// value per task. Falls back to a single `taskTeam` field for the whole batch.
// ---------------------------------------------------------------------------
router.post('/pool', authenticate, authorize('ADMIN'), upload.single('photo'), async (req, res) => {
  try {
    const { projectName, address, description, priority, locationLink } = req.body;

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

    // taskTeams: parallel array of team tags, one per title.
    let taskTeams = [];
    if (req.body.taskTeams) {
      try {
        const parsed = typeof req.body.taskTeams === 'string' ? JSON.parse(req.body.taskTeams) : req.body.taskTeams;
        if (Array.isArray(parsed)) taskTeams = parsed;
      } catch {
        taskTeams = Array.isArray(req.body.taskTeams) ? req.body.taskTeams : [req.body.taskTeams];
      }
    }
    // Single fallback for whole batch
    const defaultTeam = (req.body.taskTeam && TASK_TEAMS.includes(req.body.taskTeam))
      ? req.body.taskTeam
      : 'ALL';

    const coords = await resolveLatLngFromMapsLink(locationLink);

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
          create: titles.map((title, i) => {
            const rawTeam = taskTeams[i];
            const teamTag = (rawTeam && TASK_TEAMS.includes(rawTeam)) ? rawTeam : defaultTeam;
            return {
              title,
              priority: prio,
              pooled: true,
              userId: null,
              createdById: req.user.id,
              projectName: projectName.trim(),
              photoUrl,
              locationLink: locationLink?.trim() || null,
              latitude: coords?.lat ?? null,
              longitude: coords?.lng ?? null,
              taskTeam: teamTag
            };
          })
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

// Claim an entire opportunity.
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

// Admin: delete an entire opportunity.
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
// Single pooled task claim / release / update / delete.
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

    if (result.count === 0) return res.status(409).json({ error: 'Task already claimed' });

    const task = await prisma.task.findUnique({ where: { id: req.params.id }, select: claimSelect });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to claim task' });
  }
});

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

    const isOwner = existing.userId && existing.userId === req.user.id;
    const isPoolAdmin = existing.pooled && req.user.role === 'ADMIN';
    if (!isOwner && !isPoolAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    delete data.userId;
    delete data.createdById;
    delete data.pooled;
    delete data.claimedAt;

    // Validate taskTeam if provided.
    if (data.taskTeam && !TASK_TEAMS.includes(data.taskTeam)) {
      data.taskTeam = 'ALL';
    }

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

    const isOwner = existing.userId && existing.userId === req.user.id;
    const isPoolAdmin = existing.pooled && req.user.role === 'ADMIN';
    if (!isOwner && !isPoolAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (existing.photoFileId) await deleteFromGridFS(existing.photoFileId);
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
