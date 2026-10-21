import prisma, { trackingDb } from './src/config/database.js';

async function checkProjects() {
  try {
    console.log('🔍 Checking tracking database for projects...\n');
    
    // Count all projects (including deleted)
    const totalCount = await trackingDb.project.count();
    console.log(`📊 Total projects (including deleted): ${totalCount}`);
    
    // Count non-deleted projects
    const activeCount = await trackingDb.project.count({
      where: { deletedAt: null }
    });
    console.log(`✅ Active projects (deletedAt = null): ${activeCount}`);
    
    // Find all projects
    const allProjects = await trackingDb.project.findMany({
      select: {
        id: true,
        projectName: true,
        city: true,
        projectStatus: true,
        deletedAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`\n📋 Latest 10 projects:`);
    allProjects.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.projectName} (${p.city})`);
      console.log(`     ID: ${p.id}`);
      console.log(`     Status: ${p.projectStatus}`);
      console.log(`     Deleted: ${p.deletedAt ? 'YES' : 'NO'}`);
      console.log(`     Created: ${p.createdAt}`);
      console.log('');
    });
    
    // Try the exact query used in the API
    console.log('\n🔍 Testing API query: { deletedAt: null }');
    const apiQueryProjects = await trackingDb.project.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`✅ Found ${apiQueryProjects.length} projects with API query`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
    await trackingDb.$disconnect();
  }
}

checkProjects();
