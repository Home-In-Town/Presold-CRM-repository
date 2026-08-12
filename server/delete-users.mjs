import prisma from './src/config/database.js';

const names = ['Priya Sales', 'Rahul Manager'];

async function main() {
  const users = await prisma.user.findMany({
    where: { OR: names.map((name) => ({ name })) },
    select: { id: true, name: true, email: true, role: true }
  });

  if (!users.length) {
    console.log('No matching users found.');
    return;
  }

  console.log('FOUND USERS:', users);

  for (const user of users) {
    console.log(`Cleaning up dependencies for ${user.name} (${user.email})`);
    await prisma.leaderboard.deleteMany({ where: { userId: user.id } });
    await prisma.notification.deleteMany({ where: { userId: user.id } });
    await prisma.dailyReport.deleteMany({ where: { userId: user.id } });
    await prisma.task.deleteMany({ where: { userId: user.id } });
    await prisma.auditLog.deleteMany({ where: { userId: user.id } });
    await prisma.attendanceRecord.deleteMany({ where: { userId: user.id } });
    await prisma.bookmark.deleteMany({ where: { userId: user.id } });
    await prisma.playbookCompletion.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.leadActivity.deleteMany({ where: { userId: user.id } });
    await prisma.asset.deleteMany({ where: { uploadedById: user.id } });
    await prisma.journeyProgress.updateMany({ where: { completedById: user.id }, data: { completedById: null } });
    await prisma.lead.updateMany({ where: { assignedToId: user.id }, data: { assignedToId: null } });

    await prisma.user.delete({ where: { id: user.id } });
    console.log('DELETED:', user.name, user.email);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
