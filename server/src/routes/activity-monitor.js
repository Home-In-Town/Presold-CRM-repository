import { Router } from 'express';
import prisma from '../config/database.js';
import { trackingDb } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// GET /api/activity-monitor/live - Admin: Real-time activity dashboard
router.get('/live', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { date, userId } = req.query;
    
    // Default to today
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const where = {
      createdAt: {
        gte: targetDate,
        lt: nextDay
      }
    };

    if (userId) {
      where.OR = [
        { assignedToId: userId },
        { createdById: userId }
      ];
    }

    // Get all users to build activity map
    const users = await prisma.user.findMany({
      where: { 
        role: { in: ['SALES_EXECUTIVE', 'TEAM_LEAD'] },
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true
      },
      orderBy: { name: 'asc' }
    });

    // Get today's activities for each user
    const userActivities = await Promise.all(
      users.map(async (user) => {
        const [leads, meetings, projects] = await Promise.all([
          // Count leads created today
          prisma.lead.count({
            where: {
              createdById: user.id,
              createdAt: { gte: targetDate, lt: nextDay },
              deletedAt: null
            }
          }),
          
          // Count meetings created today (from tracking DB)
          trackingDb.meeting.count({
            where: {
              createdById: user.id,
              createdAt: { gte: targetDate, lt: nextDay },
              deletedAt: null
            }
          }),
          
          // Count projects created today (from tracking DB)
          trackingDb.project.count({
            where: {
              createdById: user.id,
              createdAt: { gte: targetDate, lt: nextDay },
              deletedAt: null
            }
          })
        ]);

        return {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            role: user.role
          },
          activities: {
            leads,
            meetings,
            projects,
            total: leads + meetings + projects
          },
          timestamp: new Date()
        };
      })
    );

    // Sort by total activities (most active first)
    userActivities.sort((a, b) => b.activities.total - a.activities.total);

    // Calculate totals
    const totals = userActivities.reduce(
      (acc, item) => ({
        leads: acc.leads + item.activities.leads,
        meetings: acc.meetings + item.activities.meetings,
        projects: acc.projects + item.activities.projects,
        total: acc.total + item.activities.total
      }),
      { leads: 0, meetings: 0, projects: 0, total: 0 }
    );

    res.json({
      date: targetDate.toISOString(),
      userActivities,
      totals,
      activeUsers: userActivities.filter(u => u.activities.total > 0).length,
      totalUsers: users.length
    });
  } catch (err) {
    console.error('Failed to fetch live activity:', err);
    res.status(500).json({ error: 'Failed to fetch live activity' });
  }
});

// GET /api/activity-monitor/user/:userId - Admin: Get specific user's activity details
router.get('/user/:userId', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;
    
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get detailed activities
    const [leads, meetings, projects] = await Promise.all([
      // Leads created today
      prisma.lead.findMany({
        where: {
          createdById: userId,
          createdAt: { gte: targetDate, lt: nextDay },
          deletedAt: null
        },
        select: {
          id: true,
          fullName: true,
          phone: true,
          company: true,
          leadType: true,
          source: true,
          stage: true,
          temperature: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      
      // Meetings created today
      trackingDb.meeting.findMany({
        where: {
          createdById: userId,
          createdAt: { gte: targetDate, lt: nextDay },
          deletedAt: null
        },
        select: {
          id: true,
          title: true,
          description: true,
          meetingDate: true,
          meetingTime: true,
          location: true,
          status: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      
      // Projects created today
      trackingDb.project.findMany({
        where: {
          createdById: userId,
          createdAt: { gte: targetDate, lt: nextDay },
          deletedAt: null
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          budget: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    res.json({
      user,
      date: targetDate.toISOString(),
      activities: {
        leads: {
          count: leads.length,
          items: leads
        },
        meetings: {
          count: meetings.length,
          items: meetings
        },
        projects: {
          count: projects.length,
          items: projects
        }
      },
      totals: {
        leads: leads.length,
        meetings: meetings.length,
        projects: projects.length,
        total: leads.length + meetings.length + projects.length
      }
    });
  } catch (err) {
    console.error('Failed to fetch user activity:', err);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

// GET /api/activity-monitor/whatsapp/:userId - Admin: Get WhatsApp formatted report for user
router.get('/whatsapp/:userId', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;
    
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get activity counts
    const [leadsCount, meetingsCount, projectsCount, leads, meetings, projects] = await Promise.all([
      prisma.lead.count({
        where: {
          createdById: userId,
          createdAt: { gte: targetDate, lt: nextDay },
          deletedAt: null
        }
      }),
      trackingDb.meeting.count({
        where: {
          createdById: userId,
          createdAt: { gte: targetDate, lt: nextDay },
          deletedAt: null
        }
      }),
      trackingDb.project.count({
        where: {
          createdById: userId,
          createdAt: { gte: targetDate, lt: nextDay },
          deletedAt: null
        }
      }),
      // Get lead details for listing
      prisma.lead.findMany({
        where: {
          createdById: userId,
          createdAt: { gte: targetDate, lt: nextDay },
          deletedAt: null
        },
        select: {
          fullName: true,
          company: true,
          leadType: true,
          temperature: true
        },
        take: 10
      }),
      trackingDb.meeting.findMany({
        where: {
          createdById: userId,
          createdAt: { gte: targetDate, lt: nextDay },
          deletedAt: null
        },
        select: {
          title: true,
          meetingDate: true,
          status: true
        },
        take: 10
      }),
      trackingDb.project.findMany({
        where: {
          createdById: userId,
          createdAt: { gte: targetDate, lt: nextDay },
          deletedAt: null
        },
        select: {
          title: true,
          status: true,
          priority: true
        },
        take: 10
      })
    ]);

    // Format date
    const dateStr = targetDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    // Build WhatsApp message
    let message = `📊 *Activity Report - ${dateStr}*\n\n`;
    message += `👤 *${user.name}*\n`;
    message += `📧 ${user.email}\n`;
    if (user.phone) message += `📱 ${user.phone}\n`;
    message += `\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    message += `📈 *Summary*\n`;
    message += `🎯 Leads Created: *${leadsCount}*\n`;
    message += `🤝 Meetings Scheduled: *${meetingsCount}*\n`;
    message += `📁 Projects Added: *${projectsCount}*\n`;
    message += `📊 Total Activities: *${leadsCount + meetingsCount + projectsCount}*\n`;
    message += `\n━━━━━━━━━━━━━━━━━━━━\n`;

    // Add lead details if any
    if (leads.length > 0) {
      message += `\n🎯 *Leads (${leadsCount})*\n`;
      leads.forEach((lead, index) => {
        message += `${index + 1}. ${lead.fullName}`;
        if (lead.company) message += ` - ${lead.company}`;
        message += `\n   Type: ${lead.leadType} | Temp: ${lead.temperature}\n`;
      });
      if (leadsCount > 10) {
        message += `   _...and ${leadsCount - 10} more_\n`;
      }
    }

    // Add meeting details if any
    if (meetings.length > 0) {
      message += `\n🤝 *Meetings (${meetingsCount})*\n`;
      meetings.forEach((meeting, index) => {
        const meetingDateStr = new Date(meeting.meetingDate).toLocaleDateString('en-IN', { 
          day: '2-digit', 
          month: 'short' 
        });
        message += `${index + 1}. ${meeting.title}\n`;
        message += `   Date: ${meetingDateStr} | Status: ${meeting.status}\n`;
      });
      if (meetingsCount > 10) {
        message += `   _...and ${meetingsCount - 10} more_\n`;
      }
    }

    // Add project details if any
    if (projects.length > 0) {
      message += `\n📁 *Projects (${projectsCount})*\n`;
      projects.forEach((project, index) => {
        message += `${index + 1}. ${project.title}\n`;
        message += `   Priority: ${project.priority} | Status: ${project.status}\n`;
      });
      if (projectsCount > 10) {
        message += `   _...and ${projectsCount - 10} more_\n`;
      }
    }

    message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    message += `\n_Generated via PreSold CRM_\n`;
    message += `_Real-time Activity Monitor_`;

    // Create WhatsApp share URL
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    res.json({
      text: message,
      whatsappUrl,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      activities: {
        leads: leadsCount,
        meetings: meetingsCount,
        projects: projectsCount,
        total: leadsCount + meetingsCount + projectsCount
      },
      date: dateStr
    });
  } catch (err) {
    console.error('Failed to generate WhatsApp report:', err);
    res.status(500).json({ error: 'Failed to generate WhatsApp report' });
  }
});

// GET /api/activity-monitor/weekly/:userId - Admin: Get weekly activity summary
router.get('/weekly/:userId', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get last 7 days
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, avatar: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get daily breakdown for last 7 days
    const dailyStats = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(startDate);
      dayStart.setDate(dayStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [leads, meetings, projects] = await Promise.all([
        prisma.lead.count({
          where: {
            createdById: userId,
            createdAt: { gte: dayStart, lte: dayEnd },
            deletedAt: null
          }
        }),
        trackingDb.meeting.count({
          where: {
            createdById: userId,
            createdAt: { gte: dayStart, lte: dayEnd },
            deletedAt: null
          }
        }),
        trackingDb.project.count({
          where: {
            createdById: userId,
            createdAt: { gte: dayStart, lte: dayEnd },
            deletedAt: null
          }
        })
      ]);

      dailyStats.push({
        date: dayStart.toISOString().split('T')[0],
        dayName: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
        leads,
        meetings,
        projects,
        total: leads + meetings + projects
      });
    }

    // Calculate totals
    const totals = dailyStats.reduce(
      (acc, day) => ({
        leads: acc.leads + day.leads,
        meetings: acc.meetings + day.meetings,
        projects: acc.projects + day.projects,
        total: acc.total + day.total
      }),
      { leads: 0, meetings: 0, projects: 0, total: 0 }
    );

    res.json({
      user,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      dailyStats,
      totals,
      averagePerDay: {
        leads: (totals.leads / 7).toFixed(1),
        meetings: (totals.meetings / 7).toFixed(1),
        projects: (totals.projects / 7).toFixed(1),
        total: (totals.total / 7).toFixed(1)
      }
    });
  } catch (err) {
    console.error('Failed to fetch weekly activity:', err);
    res.status(500).json({ error: 'Failed to fetch weekly activity' });
  }
});

export default router;
