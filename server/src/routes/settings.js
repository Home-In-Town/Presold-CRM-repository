import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, authorize('ADMIN','MANAGER','SALES_EXECUTIVE'), async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/', authenticate, authorize('ADMIN','MANAGER','SALES_EXECUTIVE'), async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    await Promise.all(entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      })
    ));
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ─── Pipeline stages (admin-editable) ───────────────────────────────────────
// Stored as a JSON array of { key, label } under the setting key "pipelineStages".
// Journey steps (COMMON category) are automatically kept in sync with stages.
const DEFAULT_STAGES = [
  { key: 'CONNECT', label: 'Connect' },
  { key: 'REPLY', label: 'Reply' },
  { key: 'INTEREST', label: 'Interest' }
];

const slugKey = (label) =>
  String(label).trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');

const jKey = (label) =>
  String(label).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

async function readStages() {
  const setting = await prisma.setting.findUnique({ where: { key: 'pipelineStages' } });
  if (!setting?.value) return DEFAULT_STAGES;
  try {
    const parsed = JSON.parse(setting.value);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .map(s => (typeof s === 'string' ? { key: slugKey(s), label: s } : s))
        .filter(s => s && s.key && s.label);
    }
  } catch { /* fall through to default */ }
  return DEFAULT_STAGES;
}

async function writeStages(stages) {
  await prisma.setting.upsert({
    where: { key: 'pipelineStages' },
    update: { value: JSON.stringify(stages), type: 'json' },
    create: { key: 'pipelineStages', value: JSON.stringify(stages), type: 'json' }
  });
}

// Keep journey steps (COMMON) in sync with the provided stage list.
// Removes steps whose labels no longer exist in stages, upserts the rest.
async function syncJourneySteps(stages) {
  const existingSteps = await prisma.journeyStep.findMany({ where: { category: 'COMMON' }, orderBy: { order: 'asc' } });

  // Delete journey steps that no longer match any stage.
  const stageLabels = stages.map(s => s.label.toLowerCase().trim());
  for (const step of existingSteps) {
    if (!stageLabels.includes(step.label.toLowerCase().trim())) {
      await prisma.journeyProgress.deleteMany({ where: { stepId: step.id } });
      await prisma.journeyStep.delete({ where: { id: step.id } });
    }
  }

  // Upsert a step for every stage (correct order).
  const fresh = await prisma.journeyStep.findMany({ where: { category: 'COMMON' } });
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const existing = fresh.find(s => s.label.toLowerCase().trim() === stage.label.toLowerCase().trim());
    if (existing) {
      await prisma.journeyStep.update({ where: { id: existing.id }, data: { order: i + 1 } });
    } else {
      await prisma.journeyStep.create({
        data: { key: jKey(stage.label), label: stage.label, order: i + 1, type: 'text', category: 'COMMON' }
      });
    }
  }
}

// GET pipeline stages — any authenticated user.
router.get('/pipeline-stages', authenticate, async (req, res) => {
  try {
    res.json(await readStages());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stages' });
  }
});

// Add a stage (admin) — also adds a matching journey step.
router.post('/pipeline-stages', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const label = (req.body?.label || '').trim();
    if (!label) return res.status(400).json({ error: 'Stage name is required' });

    const stages = await readStages();
    const key = slugKey(label);
    if (stages.some(s => s.key === key)) {
      return res.status(400).json({ error: 'A stage with this name already exists' });
    }
    const updated = [...stages, { key, label }];
    await writeStages(updated);
    await syncJourneySteps(updated);
    res.status(201).json(updated);
  } catch (err) {
    console.error('Add stage error:', err);
    res.status(500).json({ error: 'Failed to add stage' });
  }
});

// Remove a stage by key (admin) — also removes the matching journey step.
router.delete('/pipeline-stages/:key', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const stages = await readStages();
    const updated = stages.filter(s => s.key !== req.params.key);
    if (updated.length === 0) {
      return res.status(400).json({ error: 'At least one stage must remain' });
    }
    await writeStages(updated);
    await syncJourneySteps(updated);
    res.json(updated);
  } catch (err) {
    console.error('Remove stage error:', err);
    res.status(500).json({ error: 'Failed to remove stage' });
  }
});

// Force-sync journey steps to match current pipeline stages (admin utility).
router.post('/pipeline-stages/sync', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const stages = await readStages();
    await syncJourneySteps(stages);
    const steps = await prisma.journeyStep.findMany({ where: { category: 'COMMON' }, orderBy: { order: 'asc' } });
    res.json({ stages, steps });
  } catch (err) {
    res.status(500).json({ error: 'Failed to sync' });
  }
});

export default router;
