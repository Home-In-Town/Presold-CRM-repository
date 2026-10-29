import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { resolveLatLngFromMapsLink, resolveLeadCoords, geocodeText } from '../utils/geo.js';
import { upload } from '../middleware/upload.js';
import { uploadToGridFS, deleteFromGridFS } from '../config/gridfs.js';

const router = Router();

// Helper function to get OpenAI client
const getOpenAIClient = async () => {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ['OPENAI_API_KEY'] } }
  });
  const stored = settings.reduce((acc, setting) => ({ ...acc, [setting.key]: setting.value }), {});
  const openAiApiKey = process.env.OPENAI_API_KEY || stored.OPENAI_API_KEY;
  
  if (!openAiApiKey) return null;

  const { default: OpenAI } = await import('openai');
  return new OpenAI({ apiKey: openAiApiKey });
};

// TEST ENDPOINT - Simple lead creation to verify database works
router.post('/test-simple-lead', authenticate, async (req, res) => {
  try {
    console.log('=== Test Simple Lead Creation ===');
    console.log('User:', req.user?.id);
    
    const lead = await prisma.lead.create({
      data: {
        fullName: 'Test Lead',
        company: 'Test Company',
        phone: '',
        leadType: 'BUILDER',
        stage: 'CONNECT',
        temperature: 'WARM',
        source: 'PHONE_CALL',
        assignedToId: req.user.id,
        createdById: req.user.id,
        tags: JSON.stringify(['test'])
      }
    });
    
    console.log('Test lead created:', lead.id);
    
    res.json({ 
      success: true, 
      message: 'Test lead created',
      leadId: lead.id 
    });
  } catch (err) {
    console.error('Test lead creation error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      code: err.code
    });
  }
});

// POST /leads/analyze-media â€” AI vision analysis of image/video to extract lead data
router.post('/analyze-media', authenticate, async (req, res) => {
  try {
    const { image, format } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const openai = await getOpenAIClient();
    if (!openai) {
      return res.status(400).json({ 
        error: 'OpenAI API key is required for image analysis. Please configure it in Settings.' 
      });
    }

    // Construct image URL for OpenAI Vision API
    const imageUrl = `data:image/${format || 'jpeg'};base64,${image}`;

    // Call OpenAI Vision API to analyze the image
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using GPT-4o-mini for vision (more cost effective)
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that extracts business lead information from images. 
Extract the following information if visible:
- Lead name (full name of person)
- Company name
- Phone number
- Email address
- Project name (if it's a real estate/construction ad)
- Advertiser identity (whose page/brand is this)
- Ad running since (how long the ad has been running)
- Creative type (Static Poster, Reels/Video, Drone shot)
- Funnel type (Lead Form, WhatsApp redirect, Landing Page)

Return the data in JSON format with these keys:
{
  "leadData": {
    "fullName": "extracted name or null",
    "company": "extracted company or null",
    "phone": "extracted phone or null",
    "email": "extracted email or null",
    "projectName": "extracted project name or null",
    "location": "extracted location or null"
  },
  "researchData": {
    "advertiserIdentity": "whose page/brand or null",
    "adRunningSince": "duration or null",
    "creativeType": "Static Poster/Reels/Drone/null",
    "funnelType": "Lead Form/WhatsApp/Landing Page/null"
  }
}

If information is not visible or unclear, use null. Be precise and only extract what you can clearly see.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this image and extract all visible lead and advertisement information.'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.3 // Lower temperature for more precise extraction
    });

    const content = response.choices[0]?.message?.content;
    
    // Parse the JSON response
    let extractedData;
    try {
      // Try to extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return res.status(500).json({ 
        error: 'Failed to parse extracted data',
        rawResponse: content 
      });
    }

    // Validate and return the extracted data
    res.json({
      leadData: extractedData.leadData || {},
      researchData: extractedData.researchData || {},
      confidence: 'high' // Could be enhanced with confidence scoring
    });

  } catch (err) {
    console.error('Image analysis error:', err);
    res.status(500).json({ 
      error: 'Failed to analyze image',
      message: err.message 
    });
  }
});

// POST /leads/create-from-analysis â€” Create both regular lead and research lead from AI analysis
router.post('/create-from-analysis', authenticate, async (req, res) => {
  try {
    const { leadData, researchData } = req.body;

    if (!leadData || !leadData.fullName || !leadData.company) {
      return res.status(400).json({ error: 'Lead name and company are required' });
    }

    // Determine coordinates if location is provided
    let coords = null;
    if (leadData.location) {
      coords = await geocodeText(leadData.location);
    }

    // Create the main lead
    const lead = await prisma.lead.create({
      data: {
        fullName: leadData.fullName,
        company: leadData.company,
        phone: leadData.phone || '',
        email: leadData.email || '',
        location: leadData.location || '',
        latitude: coords?.lat || null,
        longitude: coords?.lng || null,
        leadType: 'BUILDER', // Default to BUILDER for photo captures
        stage: 'CONNECT',
        temperature: 'WARM',
        source: 'AI_CAPTURE', // New source type for AI-captured leads
        assignedToId: req.user.id,
        createdById: req.user.id,
        tags: JSON.stringify(['ai-capture', 'photo-lead'])
      }
    });

    // Add initial note with project information
    if (leadData.projectName) {
      await prisma.leadNote.create({
        data: {
          leadId: lead.id,
          content: `ðŸ“¸ AI-Captured Lead\n\nProject: ${leadData.projectName}\nCaptured via Quick Lead Capture feature\n${new Date().toLocaleString()}`
        }
      });
    }

    // If research data is provided, create a research data note
    if (researchData && (researchData.advertiserIdentity || researchData.creativeType)) {
      const researchNotes = [
        `ðŸ” RESEARCH DATA (AI-EXTRACTED)`,
        `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”`,
        `ðŸŽ¯ Advertiser Analysis:`,
        `  Advertiser Identity: ${researchData.advertiserIdentity || 'Not detected'}`,
        `  Ad Running Since: ${researchData.adRunningSince || 'Not detected'}`,
        `  Creative Type: ${researchData.creativeType || 'Not detected'}`,
        `  Funnel Type: ${researchData.funnelType || 'Not detected'}`,
        ``,
        `ðŸ“¸ Capture Method: AI Vision Analysis`,
        `ðŸ“… Captured: ${new Date().toLocaleString()}`,
        `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”`
      ].join('\n');

      await prisma.leadNote.create({
        data: {
          leadId: lead.id,
          content: researchNotes
        }
      });

      // Add research-data tag
      const currentTags = JSON.parse(lead.tags || '[]');
      currentTags.push('research-data');
      await prisma.lead.update({
        where: { id: lead.id },
        data: { tags: JSON.stringify(currentTags) }
      });
    }

    // Award XP for AI-captured lead (bonus XP for innovation)
    try {
      await prisma.leaderboard.upsert({
        where: { userId: req.user.id },
        create: { 
          userId: req.user.id, 
          xp: 10, // Higher XP for AI capture
          monthlyXp: 10,
          level: 1 
        },
        update: { 
          xp: { increment: 10 },
          monthlyXp: { increment: 10 }
        }
      });
    } catch (xpErr) {
      console.error('XP award error (non-blocking):', xpErr);
    }

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'LEAD_CREATED',
        title: `ðŸ“¸ Created lead via AI capture: ${leadData.fullName}`,
        userId: req.user.id,
        leadId: lead.id
      }
    });

    res.status(201).json({ 
      message: 'Lead created successfully from AI analysis',
      lead,
      researchDataAdded: !!researchData
    });

  } catch (err) {
    console.error('Lead creation from analysis error:', err);
    res.status(500).json({ 
      error: 'Failed to create lead',
      message: err.message 
    });
  }
});

// POST /leads/research-data â€” create a research data lead (simplified form)
router.post('/research-data', authenticate, async (req, res) => {
  console.log('=== Research Data Lead Endpoint Hit ===');
  console.log('User:', req.user?.id, req.user?.email);
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { 
      leadName, companyName, contactMethod, responseTime, callDate, uploadedFiles, location, role,
      // NEW: Research Data Fields
      advertiserIdentity, adRunningSince, creativeType, funnelType, 
      autoResponseCheck, firstHumanCallTime, whatsappContentAudit
    } = req.body;

    console.log('Extracted fields:', { leadName, companyName, role });

    if (!leadName || !companyName) {
      console.log('Validation failed: missing required fields');
      return res.status(400).json({ error: 'Lead name and company name are required' });
    }

    // Determine leadType based on role
    let leadType = 'INDIVIDUAL';
    if (role === 'BUILDER' || role === 'DEVELOPER') {
      leadType = 'BUILDER';
    } else if (role === 'AGENT') {
      leadType = 'AGENT';
    }

    console.log('Determined leadType:', leadType);

    // Build detailed research notes with new fields
    const researchNotes = [
      `ðŸ“‹ RESEARCH DATA LEAD`,
      `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”`,
      `ðŸ‘¤ Basic Info:`,
      `  Contact Method: ${contactMethod || 'Not specified'}`,
      `  Response Time: ${responseTime || 'Not specified'}`,
      `  Contact Date: ${callDate || 'Not specified'}`,
      `  Role: ${role || 'Not specified'}`,
      `  Location: ${location || 'Not specified'}`,
      ``,
      `ðŸŽ¯ Advertiser Analysis:`,
      `  Advertiser Identity: ${advertiserIdentity || 'Not specified'}`,
      `  Ad Running Since: ${adRunningSince || 'Not specified'}`,
      `  Creative Type: ${creativeType || 'Not specified'}`,
      `  Funnel Type: ${funnelType || 'Not specified'}`,
      ``,
      `âš¡ Response Analysis:`,
      `  Auto-Response (0-5 min): ${autoResponseCheck ? 'YES âœ…' : 'NO âŒ'}`,
      `  First Human Call: ${firstHumanCallTime || 'Not specified'}`,
      ``,
      `ðŸ’¬ WhatsApp Content Audit:`,
      `  ${whatsappContentAudit?.pdfBrochure ? 'âœ…' : 'âŒ'} PDF Brochure (15-25 MB)`,
      `  ${whatsappContentAudit?.googleMapPin ? 'âœ…' : 'âŒ'} Google Map Pin`,
      `  ${whatsappContentAudit?.videoOrWebsite ? 'âœ…' : 'âŒ'} Video/Micro-website`,
      ``,
      `ðŸ“Ž Files Uploaded: ${uploadedFiles?.length || 0} files`,
      `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”`,
      `Created: ${new Date().toLocaleString()}`
    ].join('\n');

    console.log('Creating lead in database...');

    // Create the research data lead
    const lead = await prisma.lead.create({
      data: {
        fullName: leadName,
        company: companyName,
        phone: '', // Empty phone for research leads
        leadType: leadType,
        location: location || '',
        stage: 'CONNECT',
        temperature: 'WARM',
        source: contactMethod === 'CALL' ? 'PHONE_CALL' : 'WHATSAPP',
        assignedToId: req.user.id,
        createdById: req.user.id,
        tags: JSON.stringify(['research-data', role || 'unknown'])
      }
    });

    console.log('Lead created successfully:', lead.id);

    // Add note with all research data
    console.log('Creating lead note...');
    await prisma.leadNote.create({
      data: {
        leadId: lead.id,
        content: researchNotes
      }
    });

    console.log('Lead note created successfully');

    // Award XP for adding research lead
    try {
      console.log('Awarding XP...');
      await prisma.leaderboard.upsert({
        where: { userId: req.user.id },
        create: { 
          userId: req.user.id, 
          xp: 5, 
          monthlyXp: 5,
          level: 1 
        },
        update: { 
          xp: { increment: 5 },
          monthlyXp: { increment: 5 }
        }
      });
      console.log('XP awarded successfully');
    } catch (xpErr) {
      console.error('XP award error (non-blocking):', xpErr.message);
    }

    // Create activity log
    try {
      console.log('Creating activity log...');
      await prisma.activity.create({
        data: {
          type: 'LEAD_CREATED',
          title: `ðŸ“‹ Created research lead: ${leadName}`,
          userId: req.user.id,
          leadId: lead.id
        }
      });
      console.log('Activity log created successfully');
    } catch (activityErr) {
      console.error('Activity log error (non-blocking):', activityErr.message);
    }

    console.log('=== Research Data Lead Created Successfully ===');
    res.status(201).json({ 
      message: 'Research data lead added successfully',
      lead,
      success: true
    });
  } catch (err) {
    console.error('=== Research Data Lead Creation Error ===');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    console.error('Error stack:', err.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    
    res.status(500).json({ 
      error: 'Failed to create research data lead',
      message: err.message,
      code: err.code,
      name: err.name,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Helper: build role-based where clause.
// Every authenticated user can now SEE all leads. Ownership only matters for
// edit/delete actions and the "assigned to / added by" attribution, which is
// stripped from responses for non-admin/non-qualifier users.
function roleWhere() {
  return { deletedAt: { isSet: false } };
}

// POST /leads/backfill-coords â€” admin fills coordinates for leads that don't
// have them yet, using their maps link or geocoding their text location.
// Runs sequentially with a small delay to respect the free geocoder's rate limit.
router.post('/backfill-coords', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Not allowed' });

    const leads = await prisma.lead.findMany({
      where: {
        deletedAt: { isSet: false },
        OR: [{ latitude: null }, { longitude: null }]
      },
      select: { id: true, locationLink: true, location: true, company: true }
    });

    let updated = 0;
    for (const lead of leads) {
      const coords = await resolveLeadCoords(lead);
      if (coords) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { latitude: coords.lat, longitude: coords.lng }
        });
        updated++;
      }
      // Gentle pacing for Nominatim (max ~1 req/sec).
      await new Promise(r => setTimeout(r, 1100));
    }

    res.json({ message: `Backfilled coordinates for ${updated} of ${leads.length} leads`, updated, total: leads.length });
  } catch (err) {
    console.error('Backfill coords error:', err);
    res.status(500).json({ error: 'Failed to backfill coordinates' });
  }
});

// GET /leads/assignable-users â€” admin/qualifier gets list of active users for assignment dropdown
router.get('/assignable-users', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'QUALIFIER') return res.status(403).json({ error: 'Not allowed' });
    const users = await prisma.user.findMany({
      where: { isActive: true, role: { not: 'ADMIN' } },
      select: { id: true, name: true, email: true, role: true, avatar: true },
      orderBy: { name: 'asc' }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /leads â€” list with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1, limit = 50,
      search, stage, temperature, status, priority, source,
      assignedTo, period,
      sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Base filter â€” every user sees all leads.
    const where = roleWhere();
    const canSeeAttribution = req.user.role === 'ADMIN' || req.user.role === 'QUALIFIER';

    // Admin/Qualifier can additionally filter by assignedTo
    if (assignedTo && (req.user.role === 'ADMIN' || req.user.role === 'QUALIFIER')) {
      where.assignedToId = assignedTo;
    }

    // Period filter (from dashboard cards)
    if (period === 'today') {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      where.createdAt = { gte: today };
    } else if (period === 'week') {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      where.createdAt = { gte: weekAgo };
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (stage)       where.stage       = stage;
    if (temperature) where.temperature = temperature;
    if (status)      where.status      = status;
    if (priority)    where.priority    = priority;
    if (source)      where.source      = source;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          assignedTo: { select: { id: true, name: true, avatar: true } },
          journeyProgress: { where: { completed: true } },
          _count: { select: { notes: true, files: true, activities: true } }
        }
      }),
      prisma.lead.count({ where })
    ]);

    // Populate createdBy name for leads that have createdById
    const creatorIds = [...new Set(leads.filter(l => l.createdById).map(l => l.createdById))];
    let creatorsMap = {};
    if (creatorIds.length > 0) {
      const creators = await prisma.user.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, name: true }
      });
      creatorsMap = Object.fromEntries(creators.map(c => [c.id, c.name]));
    }
    const leadsWithCreator = leads.map(l => {
      const base = {
        ...l,
        createdByName: l.createdById ? (creatorsMap[l.createdById] || null) : (l.assignedTo?.name || null)
      };
      // Hide attribution ("added by" / "assigned to") from regular team members.
      if (!canSeeAttribution) {
        delete base.createdByName;
        delete base.createdById;
        delete base.assignedTo;
        delete base.assignedToId;
      }
      return base;
    });

    res.json({
      leads: leadsWithCreator,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    console.error('Get leads error:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET /leads/:id â€” single lead. Any authenticated user can view any lead.
// Attribution ("assigned to", activity authors) is hidden from regular members.
router.get('/:id', authenticate, async (req, res) => {
  try {
    const canSeeAttribution = req.user.role === 'ADMIN' || req.user.role === 'QUALIFIER';

    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, deletedAt: { isSet: false } },
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true, email: true } },
        notes: { orderBy: { createdAt: 'desc' } },
        activities: {
          orderBy: { createdAt: 'desc' }, take: 50,
          include: { user: { select: { name: true, avatar: true } } }
        },
        files: { where: { deletedAt: { isSet: false } } },
        journeyProgress: {
          include: {
            step: true,
            completedBy: { select: { name: true } }
          }
        }
      }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Strip attribution for regular team members.
    if (!canSeeAttribution) {
      delete lead.assignedTo;
      delete lead.assignedToId;
      delete lead.createdById;
      // Keep activities but remove who performed them.
      if (Array.isArray(lead.activities)) {
        lead.activities = lead.activities.map(a => {
          const { user, ...rest } = a;
          return rest;
        });
      }
    }

    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// POST /leads â€” create (auto-assigned to current user)
router.post('/', authenticate, async (req, res) => {
  try {
    const { fullName, phone, email, company, location, locationLink, budget, timeline, source, temperature, priority, leadType, adsRunning, notes } = req.body;

    const trimmedName    = (fullName || '').trim();
    const trimmedCompany = (company || '').trim();

    // No single field is mandatory, but require at least one identifier so we
    // never create a completely empty lead.
    if (!trimmedName && !trimmedCompany && !(phone || '').trim()) {
      return res.status(400).json({ error: 'Enter a name, company or phone' });
    }

    // Duplicate detection â€” reject if a lead with the same name OR same company
    // already exists (case-insensitive), scoped to non-deleted leads.
    const dupOr = [];
    if (trimmedName)    dupOr.push({ fullName: { equals: trimmedName, mode: 'insensitive' } });
    if (trimmedCompany) dupOr.push({ company:  { equals: trimmedCompany, mode: 'insensitive' } });
    if (dupOr.length > 0) {
      const existing = await prisma.lead.findFirst({
        where: { deletedAt: { isSet: false }, OR: dupOr },
        select: { id: true, fullName: true, company: true }
      });
      if (existing) {
        const matchedBy = (trimmedName && existing.fullName?.toLowerCase() === trimmedName.toLowerCase())
          ? `name "${existing.fullName}"`
          : `company "${existing.company}"`;
        return res.status(409).json({ error: `Lead already exists with ${matchedBy}` });
      }
    }

    // Name is optional. Fall back to the company name, else a placeholder,
    // so a lead always has a usable display name.
    const resolvedName = trimmedName || trimmedCompany || 'Unnamed lead';

    // Resolve coordinates: maps link first, else geocode the text location.
    const coords = await resolveLeadCoords({ locationLink, location, company: trimmedCompany });

    const lead = await prisma.lead.create({
      data: {
        fullName: resolvedName, phone, email, company, location, budget, timeline,
        leadType: leadType || 'INDIVIDUAL',
        source: source || 'INSTAGRAM_DM',
        temperature: temperature || 'WARM',
        priority: priority || 'MEDIUM',
        adsRunning: adsRunning || false,
        locationLink: locationLink?.trim() || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        assignedToId: req.user.id,
        createdById: req.user.id   // permanent â€” never changes even if lead is reassigned
      },
      include: { assignedTo: { select: { id: true, name: true, avatar: true } } }
    });

    await prisma.leadActivity.create({
      data: { type: 'CREATED', title: 'Lead created', leadId: lead.id, userId: req.user.id }
    });

    if (notes) {
      await prisma.leadNote.create({ data: { content: notes, leadId: lead.id } });
    }

    await prisma.leaderboard.update({
      where: { userId: req.user.id },
      data: { xp: { increment: 5 }, monthlyXp: { increment: 5 }, quarterlyXp: { increment: 5 } }
    });

    res.status(201).json(lead);
  } catch (err) {
    console.error('Create lead error:', err);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// PUT /leads/:id â€” update. Any team member can update a lead (stage, notes,
// status, etc.). Only admins may reassign a lead to another user.
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.lead.findFirst({ where: { id, deletedAt: { isSet: false } } });
    if (!existing) return res.status(404).json({ error: 'Lead not found' });

    let xpGain = 0;
    if (data.stage && data.stage !== existing.stage) {
      await prisma.leadActivity.create({
        data: { type: 'STAGE_CHANGE', title: `Stage: ${existing.stage} â†’ ${data.stage}`, leadId: id, userId: req.user.id }
      });
      xpGain = data.stage === 'WON' ? 50 : 10;
    }
    if (data.status && data.status !== existing.status) {
      await prisma.leadActivity.create({
        data: { type: 'STATUS_CHANGE', title: `Status: ${existing.status} â†’ ${data.status}`, leadId: id, userId: req.user.id }
      });
    }

    // Non-admin cannot reassign leads
    if (req.user.role !== 'ADMIN') delete data.assignedToId;

    // Re-resolve coordinates if the maps link or location text changed, and we
    // don't already have coords (or the location signal was updated).
    const linkChanged = data.locationLink !== undefined && data.locationLink !== existing.locationLink;
    const locChanged  = data.location !== undefined && data.location !== existing.location;
    if (linkChanged || locChanged || existing.latitude == null) {
      const coords = await resolveLeadCoords({
        locationLink: data.locationLink ?? existing.locationLink,
        location: data.location ?? existing.location,
        company: data.company ?? existing.company
      });
      if (coords) {
        data.latitude = coords.lat;
        data.longitude = coords.lng;
      }
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true } },
        journeyProgress: { where: { completed: true } }
      }
    });

    if (xpGain > 0) {
      await prisma.leaderboard.update({
        where: { userId: req.user.id },
        data: { xp: { increment: xpGain }, monthlyXp: { increment: xpGain }, quarterlyXp: { increment: xpGain } }
      });
    }

    res.json({ lead, xpGain });
  } catch (err) {
    console.error('Update lead error:', err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// DELETE /leads/:id (sales exec can only delete their own)
// DELETE /leads/:id (non-admin can only delete their own)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const where = req.user.role !== 'ADMIN'
      ? { id: req.params.id, assignedToId: req.user.id }
      : { id: req.params.id };

    const existing = await prisma.lead.findFirst({ where });
    if (!existing) return res.status(404).json({ error: 'Lead not found or access denied' });

    await prisma.lead.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// POST /leads/:id/notes
router.post('/:id/notes', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    // verify access
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, deletedAt: { isSet: false } }
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const note = await prisma.leadNote.create({ data: { content, leadId: req.params.id } });
    await prisma.leadActivity.create({
      data: { type: 'NOTE_ADDED', title: 'Note added', leadId: req.params.id, userId: req.user.id }
    });
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// Bulk delete â€” admin only
router.post('/bulk/delete', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Not allowed' });
    const { ids } = req.body;
    await prisma.lead.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } });
    res.json({ message: `${ids.length} leads deleted` });
  } catch (err) {
    res.status(500).json({ error: 'Bulk delete failed' });
  }
});

// Bulk assign â€” admin only
router.post('/bulk/assign', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Not allowed' });
    const { ids, assignedToId } = req.body;
    await prisma.lead.updateMany({ where: { id: { in: ids } }, data: { assignedToId } });
    res.json({ message: `${ids.length} leads assigned` });
  } catch (err) {
    res.status(500).json({ error: 'Bulk assign failed' });
  }
});

// PUT /leads/:id/assign â€” admin/qualifier assigns a lead to a specific user
router.put('/:id/assign', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'QUALIFIER') return res.status(403).json({ error: 'Not allowed' });
    const { assignedToId } = req.body;
    if (!assignedToId) return res.status(400).json({ error: 'assignedToId is required' });

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { assignedToId },
      include: { assignedTo: { select: { id: true, name: true, avatar: true } } }
    });

    await prisma.leadActivity.create({
      data: { type: 'ASSIGNED', title: `Lead assigned to ${lead.assignedTo?.name || 'user'}`, leadId: lead.id, userId: req.user.id }
    });

    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign lead' });
  }
});

// PUT /leads/:id/qualify â€” QUALIFIER or ADMIN can qualify/unqualify a lead
router.put('/:id/qualify', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'QUALIFIER') {
      return res.status(403).json({ error: 'Not allowed' });
    }
    const { qualified } = req.body; // 'QUALIFIED', 'UNQUALIFIED', or 'PENDING'
    if (!['QUALIFIED', 'UNQUALIFIED', 'PENDING'].includes(qualified)) {
      return res.status(400).json({ error: 'Invalid status. Use QUALIFIED, UNQUALIFIED, or PENDING' });
    }

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        qualified,
        qualifiedBy: req.user.name,
        qualifiedAt: new Date()
      }
    });

    await prisma.leadActivity.create({
      data: {
        type: 'QUALIFIED',
        title: `Lead marked as ${qualified} by ${req.user.name}`,
        leadId: lead.id,
        userId: req.user.id
      }
    });

    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: 'Failed to qualify lead' });
  }
});

// â”€â”€â”€ Call Recordings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// GET /leads/:id/call-recordings â€” fetch all call recordings for a lead
router.get('/:id/call-recordings', authenticate, async (req, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, deletedAt: { isSet: false } }
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const recordings = await prisma.callRecording.findMany({
      where: { leadId: req.params.id, deletedAt: { isSet: false } },
      orderBy: { createdAt: 'desc' }
    });

    res.json(recordings);
  } catch (err) {
    console.error('Fetch call recordings error:', err);
    res.status(500).json({ error: 'Failed to fetch call recordings' });
  }
});

// POST /leads/:id/call-recordings â€” save a new call recording
router.post('/:id/call-recordings', authenticate, upload.single('audio'), async (req, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, deletedAt: { isSet: false } }
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    if (!req.file) return res.status(400).json({ error: 'No audio file uploaded' });

    const { duration, notes } = req.body;

    // Upload audio to GridFS
    const { url, fileId } = await uploadToGridFS(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Save call recording
    const recording = await prisma.callRecording.create({
      data: {
        audioUrl: url,
        audioFileId: fileId,
        duration: parseInt(duration) || 0,
        notes: notes || null,
        leadId: req.params.id,
        userId: req.user.id
      }
    });

    // Create activity
    await prisma.leadActivity.create({
      data: {
        type: 'CALL_RECORDED',
        title: `Call recorded (${Math.floor(recording.duration / 60)}:${String(recording.duration % 60).padStart(2, '0')})`,
        leadId: req.params.id,
        userId: req.user.id
      }
    });

    // Award XP
    await prisma.leaderboard.update({
      where: { userId: req.user.id },
      data: { xp: { increment: 5 }, monthlyXp: { increment: 5 }, quarterlyXp: { increment: 5 } }
    });

    res.status(201).json(recording);
  } catch (err) {
    console.error('Save call recording error:', err);
    res.status(500).json({ error: 'Failed to save call recording' });
  }
});

// DELETE /leads/:leadId/call-recordings/:recordingId â€” delete a call recording
router.delete('/:leadId/call-recordings/:recordingId', authenticate, async (req, res) => {
  try {
    const recording = await prisma.callRecording.findFirst({
      where: { id: req.params.recordingId, leadId: req.params.leadId }
    });

    if (!recording) return res.status(404).json({ error: 'Recording not found' });

    // Delete from GridFS
    if (recording.audioFileId) {
      await deleteFromGridFS(recording.audioFileId);
    }

    // Soft delete
    await prisma.callRecording.update({
      where: { id: req.params.recordingId },
      data: { deletedAt: new Date() }
    });

    res.json({ message: 'Call recording deleted' });
  } catch (err) {
    console.error('Delete call recording error:', err);
    res.status(500).json({ error: 'Failed to delete call recording' });
  }
});

export default router;
