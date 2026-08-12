import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { createWriteStream, writeFileSync } from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database.js';

const router = Router();

const getStoredAiKeys = async () => {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ['OPENAI_API_KEY', 'GROQ_API_KEY'] } }
  });
  return settings.reduce((acc, setting) => ({ ...acc, [setting.key]: setting.value }), {});
};

const getAiClient = async () => {
  const stored = await getStoredAiKeys();
  const groqApiKey = process.env.GROQ_API_KEY || stored.GROQ_API_KEY;
  const openAiApiKey = process.env.OPENAI_API_KEY || stored.OPENAI_API_KEY;
  const providerApiKey = groqApiKey || openAiApiKey;

  if (!providerApiKey) return null;

  const { default: OpenAI } = await import('openai');
  return new OpenAI({
    apiKey: providerApiKey,
    ...(groqApiKey ? { baseURL: 'https://api.groq.com/openai/v1' } : {})
  });
};

const getOpenAIClient = async () => {
  const stored = await getStoredAiKeys();
  const openAiApiKey = process.env.OPENAI_API_KEY || stored.OPENAI_API_KEY;
  if (!openAiApiKey) return null;

  const { default: OpenAI } = await import('openai');
  return new OpenAI({ apiKey: openAiApiKey });
};

const getModel = async () => {
  const stored = await getStoredAiKeys();
  const groqApiKey = process.env.GROQ_API_KEY || stored.GROQ_API_KEY;

  if (groqApiKey) {
    return process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
  }
  return 'gpt-3.5-turbo';
};

// AI text generation - works with Groq or OpenAI-compatible keys
router.post('/generate', authenticate, async (req, res) => {
  try {
    const { type, context, leadName, leadStage, customPrompt } = req.body;

    const openai = await getAiClient();

    if (!openai) {
      return res.status(400).json({ error: 'No AI provider key configured. Add GROQ_API_KEY or OPENAI_API_KEY in Settings.' });
    }

    const prompts = {
      followup: `Generate a professional follow-up message for a lead named "${leadName}" who is at the "${leadStage}" stage. Context: ${context || 'General follow-up'}. Keep it friendly, short, and actionable. Write in a conversational tone.`,
      whatsapp: `Write a WhatsApp message for a lead named "${leadName}" at stage "${leadStage}". Make it casual, friendly, and under 100 words. Context: ${context || 'Checking in'}`,
      email: `Write a professional email for lead "${leadName}" at stage "${leadStage}". Include subject line. Context: ${context || 'Follow up'}`,
      objection: `The lead "${leadName}" has this objection: "${context}". Provide 3 different responses to handle this objection effectively.`,
      pitch: `Generate a sales pitch for lead "${leadName}" who is a potential client. Their context: ${context || 'Interested in our services'}. Make it compelling and outcome-focused.`,
      summary: `Summarize this lead information and suggest next steps: Lead: ${leadName}, Stage: ${leadStage}, Context: ${context}`,
      proposal: `Generate a brief proposal outline for lead "${leadName}". Context: ${context || 'Standard service proposal'}`,
      meeting: `Generate a meeting summary template for a call with "${leadName}" at stage "${leadStage}". Include key discussion points and action items.`,
      custom: customPrompt || 'Generate a helpful sales message.'
    };

    const systemPrompt = 'You are an AI sales assistant for a B2B sales team. Generate concise, professional, and actionable content. Always be helpful and positive.';

    const model = await getModel();
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompts[type] || prompts.custom }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const content = completion.choices[0]?.message?.content || 'Unable to generate content.';

    const filename = `ai-text-${uuidv4()}.txt`;
    const filePath = path.join(process.cwd(), 'uploads', filename);
    writeFileSync(filePath, content, 'utf8');

    const asset = await prisma.asset.create({
      data: {
        name: filename,
        originalName: `AI: ${leadName || 'Sales message'} - ${type}.txt`,
        url: `/uploads/${filename}`,
        type: 'DOCUMENT',
        size: Buffer.byteLength(content, 'utf8'),
        mimeType: 'text/plain',
        folder: 'ai-generated',
        tags: JSON.stringify(['ai-generated', 'sales-copy', type]),
        uploadedById: req.user.id
      },
      include: {
        uploadedBy: { select: { name: true, avatar: true } }
      }
    });

    res.json({ content, type, asset });
  } catch (err) {
    console.error('AI generate error:', err);
    if (err.code === 'insufficient_quota') {
      return res.status(429).json({ error: 'AI provider quota exceeded' });
    }
    res.status(500).json({ error: 'AI generation failed. Check your provider API key.' });
  }
});

// AI Image Generation with DALL-E — saves to shared Asset library
router.post('/generate-image', authenticate, async (req, res) => {
  try {
    const { prompt, size = '1024x1024', style = 'vivid', quality = 'standard' } = req.body;

    if (!prompt?.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const openai = await getOpenAIClient();
    if (!openai) {
      return res.status(400).json({ error: 'OpenAI API key is required for image generation. Add OPENAI_API_KEY in Settings.' });
    }

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt.trim(),
      n: 1,
      size,
      style,       // 'vivid' or 'natural'
      quality,     // 'standard' or 'hd'
      response_format: 'url'
    });

    const imageUrl = response.data[0]?.url;
    const revisedPrompt = response.data[0]?.revised_prompt || prompt;

    if (!imageUrl) {
      return res.status(500).json({ error: 'No image returned from DALL-E' });
    }

    // Download the image and save to uploads folder
    const filename = `ai-${uuidv4()}.png`;
    const filePath = path.join(process.cwd(), 'uploads', filename);

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return res.status(500).json({ error: 'Failed to download generated image' });
    }
    const fileStream = createWriteStream(filePath);
    await pipeline(imageResponse.body, fileStream);

    // Get file size
    const { statSync } = await import('fs');
    const fileSize = statSync(filePath).size;

    // Save to Asset table with folder='ai-generated' — shared across all users
    const asset = await prisma.asset.create({
      data: {
        name: filename,
        originalName: `AI: ${prompt.slice(0, 80)}${prompt.length > 80 ? '...' : ''}.png`,
        url: `/uploads/${filename}`,
        type: 'IMAGE',
        size: fileSize,
        mimeType: 'image/png',
        folder: 'ai-generated',
        tags: JSON.stringify(['ai-generated', 'dall-e']),
        uploadedById: req.user.id
      },
      include: {
        uploadedBy: { select: { name: true, avatar: true } }
      }
    });

    res.json({
      asset,
      revisedPrompt,
      message: 'Image generated and saved to Asset Library'
    });
  } catch (err) {
    console.error('AI image generation error:', err);
    if (err.code === 'insufficient_quota') {
      return res.status(429).json({ error: 'AI provider quota exceeded. Check your billing.' });
    }
    if (err.status === 400) {
      return res.status(400).json({ error: err.message || 'Invalid prompt. Try a different description.' });
    }
    res.status(500).json({ error: 'Image generation failed. Check your AI provider API key.' });
  }
});

// Get all AI-generated images (shared across all users)
router.get('/generated-images', authenticate, async (req, res) => {
  try {
    const images = await prisma.asset.findMany({
      where: { folder: 'ai-generated', deletedAt: { isSet: false } },
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { name: true, avatar: true } } }
    });
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch generated images' });
  }
});

export default router;