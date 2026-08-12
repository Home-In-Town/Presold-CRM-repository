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

export default router;
