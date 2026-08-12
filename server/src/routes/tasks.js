import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

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

router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, dueDate, priority } = req.body;
    const task = await prisma.task.create({ data: { title, description, dueDate: dueDate ? new Date(dueDate) : null, priority, userId: req.user.id } });
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const data = req.body;
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    // Ownership check — users can only modify their own tasks
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
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

    // Ownership check
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
