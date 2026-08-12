import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import bcrypt from 'bcryptjs';

import prisma from './config/database.js';
import authRoutes from './routes/auth.js';
import leadRoutes from './routes/leads.js';
import pipelineRoutes from './routes/pipeline.js';
import journeyRoutes from './routes/journey.js';
import playbookRoutes from './routes/playbook.js';
import dashboardRoutes from './routes/dashboard.js';
import uploadRoutes from './routes/uploads.js';
import teamRoutes from './routes/teams.js';
import reportRoutes from './routes/reports.js';
import leaderboardRoutes from './routes/leaderboard.js';
import notificationRoutes from './routes/notifications.js';
import taskRoutes from './routes/tasks.js';
import settingsRoutes from './routes/settings.js';
import aiRoutes from './routes/ai.js';
import dayplanRoutes from './routes/dayplan.js';

const app = express();
const PORT = Number(process.env.PORT || 5001);

async function ensureAdminAccount() {
  try {
    const existing = await prisma.user.findUnique({
      where: { email: 'contact.homeintown@gmail.com' }
    });
    if (existing) return;

    const password = await bcrypt.hash('Presold@2026', 12);
    const admin = await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'contact.homeintown@gmail.com',
        password,
        role: 'ADMIN',
        isActive: true
      }
    });

    await prisma.leaderboard.upsert({
      where: { userId: admin.id },
      update: {},
      create: { userId: admin.id, xp: 0, streak: 0 }
    });

    console.log('✅ Admin account created');
  } catch (error) {
    console.error('Admin bootstrap failed:', error);
  }
}

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(u => u.trim())
    : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api', limiter);

// Static files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/journey', journeyRoutes);
app.use('/api/playbook', playbookRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dayplan', dayplanRoutes);

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

async function startServer() {
  await ensureAdminAccount();

  app.listen(PORT, () => {
    console.log(`🚀 Pre-Sold CRM server running on port ${PORT}`);
  });
}

startServer();
