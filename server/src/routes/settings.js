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
const DEFAULT_STAGES = [
  { key: 'CONNECT', label: 'Connect' },
  { key: 'REPLY', label: 'Reply' },
  { key: 'INTEREST', label: 'Interest' }
];

const slugKey = (label) =>
  String(label).trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');

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

// GET pipeline stages — any authenticated user.
router.get('/pipeline-stages', authenticate, async (req, res) => {
  try {
    res.json(await readStages());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stages' });
  }
});

// Add a stage (admin).
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
    res.status(201).json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add stage' });
  }
});

// Remove a stage by key (admin).
router.delete('/pipeline-stages/:key', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const stages = await readStages();
    const updated = stages.filter(s => s.key !== req.params.key);
    if (updated.length === 0) {
      return res.status(400).json({ error: 'At least one stage must remain' });
    }
    await writeStages(updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove stage' });
  }
});

export default router;
