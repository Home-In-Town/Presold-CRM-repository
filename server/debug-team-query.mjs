import prisma from './src/config/database.js';

async function run() {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: { isSet: false } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        isActive: true,
        pendingApproval: true,
        teamId: true,
        createdAt: true,
        lastLogin: true,
        team: { select: { name: true } },
        attendanceRecords: {
          orderBy: { checkedInAt: 'desc' },
          take: 1,
          select: { checkedInAt: true, checkedOutAt: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    console.log('USERS COUNT', users.length);
    console.log(JSON.stringify(users.slice(0, 5), null, 2));

    const teams = await prisma.team.findMany({
      where: { deletedAt: { isSet: false } },
      include: {
        members: {
          select: { id: true, name: true, email: true, role: true, avatar: true, isActive: true }
        },
        _count: { select: { leads: true } }
      }
    });
    console.log('TEAMS COUNT', teams.length);
    console.log(JSON.stringify(teams.slice(0, 5), null, 2));
  } catch (err) {
    console.error('QUERY ERROR');
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
