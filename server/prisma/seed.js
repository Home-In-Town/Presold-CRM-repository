import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ── Permanent admin ────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Presold@2026', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'contact.homeintown@gmail.com' },
    update: { role: 'ADMIN', isActive: true },
    create: {
      name: 'Admin',
      email: 'contact.homeintown@gmail.com',
      password: adminPassword,
      role: 'ADMIN',
      isActive: true
    }
  });

  await prisma.leaderboard.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id, xp: 0, streak: 0 }
  });

  // ── Journey steps ──────────────────────────────────────────────────────────
  const steps = [
    { key: 'sourced',           label: 'Lead Sourced',             order: 1,  type: 'text'     },
    { key: 'qualified',         label: 'Lead Qualified',            order: 2,  type: 'text'     },
    { key: 'first_dm',          label: 'First DM Sent',             order: 3,  type: 'text'     },
    { key: 'reply_received',    label: 'Reply Received',            order: 4,  type: 'text'     },
    { key: 'need_identified',   label: 'Need Identified',           order: 5,  type: 'text'     },
    { key: 'authority_sent',    label: 'Authority Content Sent',    order: 6,  type: 'image'    },
    { key: 'trust_content',     label: 'Trust Content Sent',        order: 7,  type: 'video'    },
    { key: 'pain_agitated',     label: 'Pain Point Agitated',       order: 8,  type: 'text'     },
    { key: 'solution_hinted',   label: 'Solution Hinted',           order: 9,  type: 'text'     },
    { key: 'trial_offered',     label: 'Trial/Value Offered',       order: 10, type: 'document' },
    { key: 'trial_consumed',    label: 'Trial Consumed',            order: 11, type: 'text'     },
    { key: 'demo_pitched',      label: 'Demo Pitched',              order: 12, type: 'text'     },
    { key: 'demo_booked',       label: 'Demo Booked',               order: 13, type: 'text'     },
    { key: 'demo_reminder',     label: 'Demo Reminder Sent',        order: 14, type: 'text'     },
    { key: 'demo_done',         label: 'Demo Completed',            order: 15, type: 'video'    },
    { key: 'objections_handled',label: 'Objections Handled',        order: 16, type: 'text'     },
    { key: 'proposal_sent',     label: 'Proposal Sent',             order: 17, type: 'document' },
    { key: 'followup_sequence', label: 'Follow-up Sequence',        order: 18, type: 'text'     },
    { key: 'closed_won',        label: 'Closed Won',                order: 19, type: 'text'     },
    { key: 'referral_asked',    label: 'Referral Asked',            order: 20, type: 'text'     }
  ];

  for (const step of steps) {
    await prisma.journeyStep.upsert({ where: { key: step.key }, update: {}, create: step });
  }

  // ── Playbook modules ───────────────────────────────────────────────────────
  const modules = [
    { title: 'The Pre-Sold Mindset',    category: 'Mindset',        order: 1,  icon: 'brain',     color: '#8b5cf6' },
    { title: 'Infrastructure Setup',    category: 'Infrastructure', order: 2,  icon: 'building',  color: '#3b82f6' },
    { title: 'Traffic Generation',      category: 'Traffic',        order: 3,  icon: 'megaphone', color: '#06b6d4' },
    { title: 'DM Mastery',              category: 'DM',             order: 4,  icon: 'message',   color: '#10b981' },
    { title: 'Authority Building',      category: 'Authority',      order: 5,  icon: 'crown',     color: '#f59e0b' },
    { title: 'Trust Acceleration',      category: 'Trust',          order: 6,  icon: 'shield',    color: '#ec4899' },
    { title: 'Trial & Value First',     category: 'Trial',          order: 7,  icon: 'gift',      color: '#14b8a6' },
    { title: 'Demo Booking System',     category: 'Demo',           order: 8,  icon: 'calendar',  color: '#6366f1' },
    { title: 'Closing Framework',       category: 'Closing',        order: 9,  icon: 'handshake', color: '#f97316' },
    { title: 'Referral Engine',         category: 'Referral',       order: 10, icon: 'users',     color: '#22c55e' }
  ];

  for (const mod of modules) {
    const existing = await prisma.playbookModule.findFirst({ where: { title: mod.title } });
    if (existing) continue;
    const m = await prisma.playbookModule.create({ data: mod });
    await prisma.playbookScript.create({
      data: {
        title: `${mod.category} - Opening Script`,
        meta: `Primary script for ${mod.category.toLowerCase()} phase`,
        copyScript: `Hey [Name]! I noticed you're working on [their business]. I help people like you achieve [result] — would you be open to a quick chat?`,
        whatsappTemplate: `Hi [Name] 👋\nI saw your [post/business] and thought of something that might help.\nWould you be open to a 2-min voice note about [topic]?`,
        emailTemplate: `Subject: Quick idea for [Company]\n\nHi [Name],\n\nI came across [Company] and noticed [observation].\n\nI help [target audience] achieve [result].\n\nWould you be open to a 15-min call this week?\n\nBest,\n[Your Name]`,
        explanation: `This script is designed for the ${mod.category.toLowerCase()} phase of the sales journey.`,
        psychology: `People respond to personalization and genuine interest in their work.`,
        framework: `Compliment → Observation → Question (COQ Framework)`,
        checklist: JSON.stringify(['Personalize the message', 'Reference something specific', 'Ask one clear question', 'Keep it under 50 words']),
        mistakes: JSON.stringify(['Sending generic copy-paste', 'Pitching immediately', 'Writing too much']),
        kpis: JSON.stringify(['Reply rate', 'Conversation rate']),
        moduleId: m.id,
        order: 1
      }
    });
  }

  console.log('✅ Seed completed');
  console.log('👤 Admin: contact.homeintown@gmail.com / Presold@2026');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
