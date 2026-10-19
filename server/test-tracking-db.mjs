import { trackingDb } from './src/config/database.js';

async function test() {
  try {
    await trackingDb.$connect();
    console.log('✅ Connected to tracking DB');
    
    const count = await trackingDb.project.count();
    console.log('📊 Projects in tracking DB:', count);
    
    const projects = await trackingDb.project.findMany({
      take: 3,
      select: {
        id: true,
        projectName: true,
        coverImageUrl: true,
        createdAt: true
      }
    });
    
    console.log('📋 Recent projects:');
    projects.forEach(p => {
      console.log(`  - ${p.projectName} (${p.coverImageUrl ? 'has image' : 'NO IMAGE'})`);
    });
    
    await trackingDb.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

test();
