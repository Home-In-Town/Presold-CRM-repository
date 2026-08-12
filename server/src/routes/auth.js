import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Register — allow selecting a registration role from an approved set (still pending admin approval)
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);

    // Allow the registrant to pick a role from a safe whitelist. Still mark inactive/pending for admin approval.
    const allowedRoles = ['SALES_EXECUTIVE', 'B2B_SALES', 'DMA_WHITE_LABEL', 'CONTENT_CREATION'];
    const safeRole = allowedRoles.includes(role) ? role : 'B2B_SALES';
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashed,
        role: safeRole,
        isActive: false,
        pendingApproval: true
      }
    });

    // Create leaderboard entry
    await prisma.leaderboard.create({ data: { userId: user.id } });

    // Notify admins to approve the new salesperson
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
    if (admins.length > 0) {
      const notifications = admins.map(admin => ({
        title: 'New salesperson registration',
        message: `${user.name} (${user.email}) requested access. Approve or reject them on the Team page.`,
        type: 'info',
        link: '/team',
        userId: admin.id
      }));
      await prisma.notification.createMany({ data: notifications });
    }

    return res.status(201).json({
      pending: true,
      message: 'Account created. Please wait for admin approval before logging in.',
      user: { id: user.id, name: user.name, email: user.email, role: user.role, isActive: false, pendingApproval: true }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ error: 'Account suspended' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Update streak
    const now = new Date();
    const leaderboard = await prisma.leaderboard.findUnique({ where: { userId: user.id } });
    if (leaderboard) {
      const lastActive = new Date(leaderboard.lastActive);
      const dayDiff = Math.floor((now - lastActive) / 86400000);
      const newStreak = dayDiff === 1 ? leaderboard.streak + 1 : dayDiff > 1 ? 1 : leaderboard.streak;
      await prisma.leaderboard.update({
        where: { userId: user.id },
        data: { streak: newStreak, lastActive: now }
      });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: now } });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, phone: user.phone }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { leaderboard: true, team: true }
    });
    const { password, resetToken, resetExpires, ...safe } = user;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, phone, avatar },
      select: { id: true, name: true, email: true, phone: true, avatar: true, role: true }
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// Change password
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Password change failed' });
  }
});

export default router;
