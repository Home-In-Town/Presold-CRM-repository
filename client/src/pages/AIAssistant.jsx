import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Sparkles, MessageCircle, Mail, Phone, FileText, Shield,
  Copy, Check, Image, Wand2, Download, ExternalLink, Trash2,
  User, Calendar, Eye, X, ChevronLeft, ChevronRight, FolderOpen,
  Loader2, HardDrive, RefreshCw
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const TEXT_TYPES = [
  { key: 'followup',  label: 'Follow-up', icon: MessageCircle, desc: 'Follow-up message'   },
  { key: 'whatsapp',  label: 'WhatsApp',  icon: MessageCircle, desc: 'WhatsApp message'     },
  { key: 'email',     label: 'Email',     icon: Mail,          desc: 'Professional email'   },
  { key: 'objection', label: 'Objection', icon: Shield,        desc: 'Handle objections'    },
  { key: 'pitch',     label: 'Pitch',     icon: Sparkles,      desc: 'Sales pitch'          },
  { key: 'summary',   label: 'Summary',   icon: FileText,      desc: 'Lead summary'         },
  { key: 'proposal',  label: 'Proposal',  icon: FileText,      desc: 'Proposal outline'     },
  { key: 'meeting',   label: 'Meeting',   icon: Phone,         desc: 'Meeting summary'      },
];

const SIZES   = ['1024x1024', '1792x1024', '1024x1792'];
const STYLES  = ['vivid', 'natural'];
const QUALITY = ['standard', 'hd'];

const SIZE_LABELS   = { '1024x1024': 'Square (1:1)', '1792x1024': 'Landscape (16:9)', '1024x1792': 'Portrait (9:16)' };
const STYLE_LABELS  = { vivid: '🎨 Vivid',   natural: '🌿 Natural'   };
const QUALITY_LABELS = { standard: '⚡ Standard', hd: '✨ HD'         };

const EXAMPLE_PROMPTS = [
  'A modern luxury real estate project with city skyline view, golden hour lighting, photorealistic',
  'A professional sales team celebrating a deal closed, corporate office, cinematic lighting',
  'A futuristic SaaS dashboard on a laptop in a minimalist workspace, blue accent lighting',
  'A happy client shaking hands with a sales executive in a glass office building',
  'A motivational poster with bold typography: "Every No is One Step Closer to Yes"',
];

function formatSize(bytes) {
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ─── Copy Button ──────────────────────────────────────────────────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied!', { duration: 1500 });
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handle} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
      {copied ? <><Check size={12} className="text-green-400" /> Copied</> : <><Copy size={12} /> Copy</>}
    </button>
  );
}

// ─── Image Lightbox ───────────────────────────────────────────────────────────
function ImageLightbox({ image, onClose, onDownload }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}
        className="relative glass-card overflow-hidden max-w-2xl w-full"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <span className="flex items-center gap-2 text-xs font-semibold text-purple-400">
            <Sparkles size={12} /> AI Generated Image
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => onDownload(image)} className="btn-ghost p-1.5">
              <Download size={14} />
            </button>
            <a href={image.url} target="_blank" rel="noreferrer" className="btn-ghost p-1.5">
              <ExternalLink size={14} />
            </a>
            <button onClick={onClose} className="btn-ghost p-1.5"><X size={14} /></button>
          </div>
        </div>
        <div className="bg-dark-900/70 p-2">
          <img src={image.url} alt={image.originalName} className="w-full rounded-xl max-h-[65vh] object-contain" />
        </div>
        <div className="px-4 py-3 border-t border-white/5 space-y-1">
          <p className="text-xs text-gray-300 leading-relaxed">
            {image.originalName?.replace('AI: ', '').replace('.png', '')}
          </p>
          <div className="flex items-center gap-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><User size={9} />{image.uploadedBy?.name}</span>
            <span className="flex items-center gap-1"><Calendar size={9} />{new Date(image.createdAt).toLocaleString()}</span>
            <span className="flex items-center gap-1"><HardDrive size={9} />{formatSize(image.size)}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Text Generation Tab ──────────────────────────────────────────────────────
function TextTab() {
  const [type, setType] = useState('followup');
  const [leadName, setLeadName] = useState('');
  const [leadStage, setLeadStage] = useState('INTEREST');
  const [context, setContext] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!leadName.trim()) { toast.error('Enter lead name'); return; }
    setLoading(true);
    setResult('');
    try {
      const res = await api.post('/ai/generate', { type, leadName, leadStage, context });
      setResult(res.data.content);
    } catch (err) {
      toast.error(err.response?.data?.error || 'AI generation failed');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      {/* Type grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TEXT_TYPES.map(t => (
          <button key={t.key} onClick={() => setType(t.key)}
            className={`p-3 rounded-xl border text-left transition-all active:scale-[0.97]
              ${type === t.key
                ? 'border-brand-500/40 bg-brand-600/10 shadow-glow'
                : 'border-white/5 bg-dark-700/50 hover:bg-dark-600/50 hover:border-white/10'}`}
          >
            <t.icon size={16} className={type === t.key ? 'text-brand-400' : 'text-gray-500'} />
            <p className={`text-xs font-medium mt-1.5 ${type === t.key ? 'text-white' : 'text-gray-400'}`}>{t.label}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">{t.desc}</p>
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div className="glass-card p-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text" value={leadName} onChange={e => setLeadName(e.target.value)}
            placeholder="Lead name *" className="input-field text-sm"
          />
          <select value={leadStage} onChange={e => setLeadStage(e.target.value)} className="input-field text-sm">
            {['CONNECT','REPLY','INTEREST','TRUST','TRIAL','DEMO_BOOKED','DEMO_ATTENDED','PROPOSAL_SENT','NEGOTIATION'].map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <textarea
          value={context} onChange={e => setContext(e.target.value)}
          placeholder="Context — what they said, their objection, their industry, specific situation..."
          className="input-field text-sm h-24 resize-none"
        />
        <button onClick={generate} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading
            ? <><Loader2 size={15} className="animate-spin" /> Generating...</>
            : <><Sparkles size={15} /> Generate Content</>}
        </button>
      </div>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-brand-400 flex items-center gap-1.5">
                <Sparkles size={12} /> AI Generated Content
              </span>
              <div className="flex items-center gap-2">
                <CopyBtn text={result} />
                <button onClick={() => setResult('')} className="btn-ghost p-1"><X size={12} /></button>
              </div>
            </div>
            <div className="bg-dark-600/40 rounded-xl p-4 border border-white/5">
              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{result}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Image Generation Tab ─────────────────────────────────────────────────────
function ImageTab() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [size, setSize]     = useState('1024x1024');
  const [style, setStyle]   = useState('vivid');
  const [quality, setQuality] = useState('standard');
  const [generating, setGenerating] = useState(false);
  const [latestImage, setLatestImage] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [previewImg, setPreviewImg] = useState(null);
  const [revisedPrompt, setRevisedPrompt] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => { loadGallery(); }, []);

  const loadGallery = async () => {
    setGalleryLoading(true);
    try {
      const res = await api.get('/ai/generated-images');
      setGallery(res.data);
    } catch {}
    setGalleryLoading(false);
  };

  const generate = async () => {
    if (!prompt.trim()) { toast.error('Enter an image prompt'); return; }
    setGenerating(true);
    setLatestImage(null);
    setRevisedPrompt('');
    try {
      const res = await api.post('/ai/generate-image', { prompt: prompt.trim(), size, style, quality });
      setLatestImage(res.data.asset);
      setRevisedPrompt(res.data.revisedPrompt);
      toast.success('Image generated and saved to Assets! 🎨');
      loadGallery();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Image generation failed');
    }
    setGenerating(false);
  };

  const downloadLatestImage = async (image) => {
    try {
      const response = await api.get(`/uploads/assets/${image.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.originalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Download failed');
    }
  };

  const deleteImage = async (id) => {
    if (!window.confirm('Delete this image?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/uploads/assets/${id}`);
      setGallery(prev => prev.filter(g => g.id !== id));
      if (latestImage?.id === id) setLatestImage(null);
      toast.success('Image deleted');
    } catch { toast.error('Delete failed'); }
    setDeletingId(null);
  };

  return (
    <div className="space-y-5">
      {/* Prompt Input */}
      <div className="glass-card p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-400 block mb-2">
            Image Prompt <span className="text-gray-600 font-normal">— describe what you want to generate</span>
          </label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g. A modern luxury apartment building at sunset with city view, photorealistic, cinematic lighting..."
            className="input-field text-sm h-28 resize-none"
          />
          {/* Char count */}
          <div className="flex items-center justify-between mt-1.5">
            <span className={`text-[10px] ${prompt.length > 900 ? 'text-red-400' : 'text-gray-600'}`}>
              {prompt.length}/1000 characters
            </span>
            <button
              onClick={() => setPrompt('')}
              className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Example Prompts */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Example Prompts</p>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_PROMPTS.map((ex, i) => (
              <button
                key={i}
                onClick={() => setPrompt(ex)}
                className="text-[10px] text-gray-400 bg-dark-600/50 hover:bg-dark-500/50 border border-white/5 hover:border-white/10 rounded-lg px-2.5 py-1.5 transition-all text-left truncate max-w-[240px]"
              >
                {ex.slice(0, 50)}…
              </button>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Size</label>
            <div className="flex flex-col gap-1.5">
              {SIZES.map(s => (
                <button key={s} onClick={() => setSize(s)}
                  className={`text-xs px-3 py-2 rounded-xl border text-left transition-all
                    ${size === s ? 'bg-brand-600/10 border-brand-500/30 text-brand-300' : 'bg-dark-600/40 border-white/5 text-gray-400 hover:border-white/10'}`}>
                  {SIZE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Style</label>
            <div className="flex flex-col gap-1.5">
              {STYLES.map(s => (
                <button key={s} onClick={() => setStyle(s)}
                  className={`text-xs px-3 py-2 rounded-xl border transition-all
                    ${style === s ? 'bg-purple-600/10 border-purple-500/30 text-purple-300' : 'bg-dark-600/40 border-white/5 text-gray-400 hover:border-white/10'}`}>
                  {STYLE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Quality</label>
            <div className="flex flex-col gap-1.5">
              {QUALITY.map(q => (
                <button key={q} onClick={() => setQuality(q)}
                  className={`text-xs px-3 py-2 rounded-xl border transition-all
                    ${quality === q ? 'bg-amber-600/10 border-amber-500/30 text-amber-300' : 'bg-dark-600/40 border-white/5 text-gray-400 hover:border-white/10'}`}>
                  {QUALITY_LABELS[q]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generate}
          disabled={generating || !prompt.trim()}
          className="w-full relative overflow-hidden rounded-xl py-3.5 font-semibold text-sm transition-all
            disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]
            bg-gradient-to-r from-purple-600 to-brand-600 hover:from-purple-500 hover:to-brand-500
            text-white shadow-lg shadow-purple-600/20 hover:shadow-purple-500/30
            flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Generating with DALL-E 3…</span>
              <span className="text-xs text-white/60 ml-1">(~10 seconds)</span>
            </>
          ) : (
            <>
              <Wand2 size={16} />
              Generate Image
              <span className="text-xs text-white/60 ml-1">• Saves to Assets</span>
            </>
          )}
        </button>
      </div>

      {/* Latest Generated Image */}
      <AnimatePresence>
        {latestImage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card overflow-hidden border border-purple-500/20"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-xs font-semibold text-purple-400 flex items-center gap-1.5">
                <Sparkles size={12} /> Just Generated
              </span>
              <div className="flex items-center gap-2">
                <a href={latestImage.url} download className="btn-ghost p-1.5 text-gray-400 hover:text-white">
                  <Download size={14} />
                </a>
                <a href={latestImage.url} target="_blank" rel="noreferrer" className="btn-ghost p-1.5 text-gray-400 hover:text-white">
                  <ExternalLink size={14} />
                </a>
                <button onClick={() => setPreviewImg(latestImage)} className="btn-ghost p-1.5 text-gray-400 hover:text-white">
                  <Eye size={14} />
                </button>
              </div>
            </div>
            <div
              className="cursor-zoom-in bg-dark-900/50 flex items-center justify-center p-4"
              onClick={() => setPreviewImg(latestImage)}
            >
              <img
                src={latestImage.url}
                alt="Generated"
                className="max-h-96 rounded-xl object-contain shadow-2xl"
              />
            </div>
            {revisedPrompt && revisedPrompt !== prompt && (
              <div className="px-4 py-3 border-t border-white/5 bg-dark-700/20">
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">
                  DALL-E refined your prompt to:
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">{revisedPrompt}</p>
              </div>
            )}
            <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><HardDrive size={9} />{formatSize(latestImage.size)}</span>
                <span className="text-green-400 flex items-center gap-1">
                  <Check size={9} /> Saved to Asset Library
                </span>
              </div>
              <button
                onClick={() => deleteImage(latestImage.id)}
                className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
              >
                <Trash2 size={10} /> Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gallery */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Image size={15} className="text-purple-400" />
            Team's AI Gallery
            {gallery.length > 0 && (
              <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                {gallery.length}
              </span>
            )}
          </h3>
          <button onClick={loadGallery} className="btn-ghost p-2 text-gray-500 hover:text-white" title="Refresh">
            <RefreshCw size={13} className={galleryLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {galleryLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square bg-dark-700 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : gallery.length === 0 ? (
          <div className="text-center py-12 glass-card border-dashed">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-3">
              <Image size={22} className="text-purple-400" />
            </div>
            <p className="text-sm text-gray-500">No images generated yet</p>
            <p className="text-xs text-gray-600 mt-1">Your first generated image will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {gallery.map(img => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-dark-700 cursor-pointer"
                onClick={() => setPreviewImg(img)}
              >
                <img
                  src={img.url}
                  alt={img.originalName}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-end p-2.5">
                  <p className="text-[9px] text-white/80 truncate leading-tight mb-1.5">
                    {img.originalName?.replace('AI: ', '').replace('.png', '')}
                  </p>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => downloadLatestImage(img)}
                      className="flex items-center gap-1 text-[9px] text-white bg-white/15 hover:bg-white/25 rounded-md px-1.5 py-1 transition-colors"
                    >
                      <Download size={9} /> Save
                    </button>
                    <button
                      onClick={() => deleteImage(img.id)}
                      disabled={deletingId === img.id}
                      className="flex items-center gap-1 text-[9px] text-red-300 bg-red-500/20 hover:bg-red-500/30 rounded-md px-1.5 py-1 transition-colors"
                    >
                      {deletingId === img.id ? <Loader2 size={9} className="animate-spin" /> : <Trash2 size={9} />}
                      Del
                    </button>
                  </div>
                </div>
                {/* Owner badge */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[9px] font-medium text-white/70 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
                    {img.uploadedBy?.name?.split(' ')[0]}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {previewImg && <ImageLightbox image={previewImg} onClose={() => setPreviewImg(null)} onDownload={downloadLatestImage} />}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AIAssistant() {
  const [activeTab, setActiveTab] = useState('text');

  const tabs = [
    { key: 'text',  label: 'Text Generation',  icon: Sparkles,
      desc: 'Follow-ups, emails, pitches', color: 'brand' },
    { key: 'image', label: 'Image Generation', icon: Wand2,
      desc: 'DALL-E 3 • Saves to Assets',  color: 'purple' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Page Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 mb-4 shadow-glow-lg"
        >
          <Bot size={24} className="text-white" />
        </motion.div>
        <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
        <p className="text-xs text-gray-500 mt-1">
          Generate sales content and images powered by OpenAI
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 p-1 bg-dark-700/50 rounded-2xl border border-white/5 max-w-md mx-auto">
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium
                transition-all duration-200 active:scale-[0.97]
                ${isActive
                  ? tab.key === 'image'
                    ? 'bg-gradient-to-r from-purple-600 to-brand-600 text-white shadow-lg'
                    : 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                  : 'text-gray-500 hover:text-gray-300'
                }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.key === 'text' ? 'Text' : 'Image'}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Descriptor */}
      <motion.p
        key={activeTab}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-xs text-gray-600"
      >
        {activeTab === 'text'
          ? '✍️ Generate follow-ups, pitches, emails, and objection handlers'
          : '🎨 Generate images with DALL-E 3 — auto-saved to the shared Asset Library'}
      </motion.p>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: activeTab === 'image' ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: activeTab === 'image' ? -20 : 20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'text'  && <TextTab  />}
          {activeTab === 'image' && <ImageTab />}
        </motion.div>
      </AnimatePresence>

      {/* Info banner */}
      <div className="flex items-start gap-3 glass-card p-4 border-brand-500/10">
        <div className="w-8 h-8 rounded-xl bg-brand-600/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot size={14} className="text-brand-400" />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-300">OpenAI API Key Required</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Add your OpenAI API key in <a href="/settings" className="text-brand-400 hover:underline">Settings</a> to enable image generation, and optionally a GROQ key for text generation.
            Text generation uses GPT-3.5-turbo or Groq-compatible models, while image generation uses DALL-E 3.
            Generated images are automatically saved to the{' '}
            <a href="/assets" className="text-purple-400 hover:underline">Asset Library</a>{' '}
            and visible to your entire team.
          </p>
        </div>
      </div>

    </div>
  );
}
