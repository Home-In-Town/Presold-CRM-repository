import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'https://presold-crm-server-624770114041.asia-south1.run.app/api';
const EMAIL = 'contact.homeintown@gmail.com';
const PASSWORD = 'Presold@2026';

async function testCreateProject() {
  try {
    // 1. Login
    console.log('🔑 Logging in...');
    const https = await import('https');
    const { request } = https.default || https;
    
    // Use native fetch (Node.js 18+)
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });

    const loginData = await loginResponse.json();
    if (!loginData.token) {
      console.error('❌ Login failed:', loginData);
      return;
    }
    console.log('✅ Logged in as:', loginData.user.email, `(${loginData.user.role})`);
    const token = loginData.token;

    // 2. Create a test image file
    console.log('\n📸 Creating test cover image...');
    const testImagePath = path.join(__dirname, 'test-project-cover.jpg');
    
    // Create a simple 1x1 pixel JPEG (base64 decoded)
    const jpegData = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q==', 'base64');
    fs.writeFileSync(testImagePath, jpegData);

    // 3. Create multipart form data manually
    console.log('\n📝 Creating project form data...');
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    let body = '';
    
    // Add text fields
    const fields = {
      projectName: 'Test Project ' + Date.now(),
      category: 'RESIDENTIAL',
      propertyType: 'APARTMENT',
      city: 'Mumbai',
      locationArea: 'Andheri West',
      projectStatus: 'UNDER_CONSTRUCTION',
      locationAddress: '123 Test Street, Andheri West',
      startingPrice: '75',
      reraApproved: 'true',
      reraNumber: 'TEST123456',
      bhkOptions: JSON.stringify(['2 BHK', '3 BHK']),
      amenities: JSON.stringify(['Swimming Pool', 'Gym', 'Parking']),
      facingOptions: JSON.stringify(['East', 'West'])
    };
    
    for (const [key, value] of Object.entries(fields)) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
      body += `${value}\r\n`;
    }
    
    // Add cover image
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="coverImage"; filename="cover.jpg"\r\n`;
    body += `Content-Type: image/jpeg\r\n\r\n`;
    const bodyBuffer = Buffer.concat([
      Buffer.from(body, 'utf8'),
      jpegData,
      Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
    ]);

    // 4. Submit project
    console.log('\n📤 Submitting project...');
    const createResponse = await fetch(`${API_URL}/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length.toString()
      },
      body: bodyBuffer
    });

    const responseText = await createResponse.text();
    console.log('\n📊 Response status:', createResponse.status);
    console.log('📊 Response headers:', Object.fromEntries(createResponse.headers.entries()));
    
    try {
      const createData = JSON.parse(responseText);
      if (createResponse.ok) {
        console.log('✅ Project created successfully!');
        console.log('Project ID:', createData.project?.id);
        console.log('Project Name:', createData.project?.projectName);
      } else {
        console.error('❌ Failed to create project:', createData);
      }
    } catch (e) {
      console.error('❌ Failed to parse response:', responseText);
    }

    // 5. Fetch projects
    console.log('\n📥 Fetching all projects...');
    const listResponse = await fetch(`${API_URL}/projects`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const listData = await listResponse.json();
    console.log(`✅ Found ${listData.projects.length} projects`);
    listData.projects.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.projectName} (${p.city}) - ${p.projectStatus}`);
    });

    // Cleanup
    fs.unlinkSync(testImagePath);
    console.log('\n🧹 Cleaned up test files');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testCreateProject();
