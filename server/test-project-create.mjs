import { trackingDb } from './src/config/database.js';
import { uploadToTrackingGridFS } from './src/config/gridfs.js';
import fs from 'fs';

async function testProjectCreation() {
  try {
    console.log('🧪 Testing project creation flow...');
    
    await trackingDb.$connect();
    console.log('✅ Connected to tracking database');
    
    // Check if we can query projects
    const existingProjects = await trackingDb.project.findMany({
      take: 5,
      select: {
        id: true,
        projectName: true,
        coverImageUrl: true,
        category: true,
        city: true,
        createdAt: true
      }
    });
    
    console.log(`\n📊 Found ${existingProjects.length} existing projects:`);
    existingProjects.forEach(p => {
      console.log(`  - ${p.projectName} (${p.city})`);
      console.log(`    Cover: ${p.coverImageUrl || 'NO IMAGE'}`);
      console.log(`    Category: ${p.category}`);
    });
    
    // Test if we can create a test buffer for image
    console.log('\n🔍 Testing GridFS upload capability...');
    const testBuffer = Buffer.from('test image data');
    const testResult = await uploadToTrackingGridFS(testBuffer, 'test.jpg', 'image/jpeg');
    console.log('✅ GridFS upload works!');
    console.log(`   File ID: ${testResult.fileId}`);
    console.log(`   URL: ${testResult.url}`);
    
    console.log('\n✅ All tests passed! Project creation should work.');
    
    await trackingDb.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testProjectCreation();
