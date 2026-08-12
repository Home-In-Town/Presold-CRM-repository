import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Image, Video, FileText, Mic, Search, Trash2,
  Download, FolderOpen, Sparkles, X, ExternalLink, Bot,
  Eye, Calendar, User, HardDrive, Tag, ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const FOLDERS = [
  { key: 'all',          label: 'All Files',     icon: FolderOpen,  color: 'text-gray-400'  },
  { key: 'ai-generated', label: 'AI Generated',  icon: Sparkles,    color: 'text-purple-400' },
  { key: 'general',      label: 'General',       icon: FolderOpen,  color: 'text-brand-400'  },
];

const TYPE_FILTERS = ['', 'IMAGE', 'VIDEO', 'DOCUMENT', 'VOICE'];

const typeIcons  = { IMAGE: Image, VIDEO: Video, DOCUMENT: FileText, VOICE: Mic, OTHER: FileText };
const typeColors = { IMAGE: 'text-pink-400', VIDEO: 'text-red-400', DOCUMENT: 'text-blue-400', VOICE: 'text-amber-400', OTHER: 'text-gray-400' };
const typeBg     = { IMAGE: 'bg-pink-500/10', VIDEO: 'bg-red-500/10', DOCUMENT: 'bg-blue-500/10', VOICE: 'bg-amber-500/10', OTHER: 'bg-gray-500/10' };

const getLogoOverlayStyle = (position) => {
  const base = {
    position: 'absolute',
    zIndex: 2,
    maxWidth: '22%',
    maxHeight: '22%',
    objectFit: 'contain',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(0,0,0,0.25)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    padding: '6px'
  };

  if (position === 'top-left') return { ...base, top: '14px', left: '14px' };
  if (position === 'top-right') return { ...base, top: '14px', right: '14px' };
  if (position === 'bottom-left') return { ...base, bottom: '14px', left: '14px' };
  if (position === 'center') return { ...base, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  return { ...base, bottom: '14px', right: '14px' };
};

function formatSize(bytes) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ─── Lightbox ────────────────────────────────────────────────────────────────
function Lightbox({ asset, assets, onClose, onDownload, branding }) {
  const [idx, setIdx] = useState(assets.findIndex(a => a.id === asset.id));
  const current = assets[idx];

  const prev = useCallback(() => setIdx(i => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIdx(i => Math.min(assets.length - 1, i + 1)), [assets.length]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, prev, next]);

  if (!current) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="relative flex flex-col max-w-4xl w-full max-h-[90vh] glass-card overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {current.folder === 'ai-generated' && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                <Sparkles size={9} /> AI Generated
              </span>
            )}
            <p className="text-sm font-medium text-white truncate">{current.originalName}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => onDownload?.(current)} className="btn-ghost p-2"><Download size={15} /></button>
            <a href={current.url} target="_blank" rel="noreferrer" className="btn-ghost p-2"><ExternalLink size={15} /></a>
            <button onClick={onClose} className="btn-ghost p-2"><X size={15} /></button>
          </div>
        </div>

        {/* Image */}
        <div className="flex-1 overflow-hidden flex items-center justify-center bg-dark-900/50 p-4 min-h-0">
          <div className="relative inline-flex max-w-full max-h-full">
            {current.type === 'IMAGE' ? (
              <img
                src={current.url}
                alt={current.originalName}
                className="max-w-full max-h-full object-contain rounded-xl"
              />
            ) : current.type === 'VIDEO' ? (
              <video src={current.url} controls className="max-w-full max-h-full rounded-xl" />
            ) : (
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <FileText size={48} />
                <p className="text-sm">{current.originalName}</p>
              </div>
            )}
            {branding?.brandLogoEnabled && branding?.brandLogoUrl && (
              <img
                src={branding.brandLogoUrl}
                alt="Brand logo overlay"
                className="pointer-events-none"
                style={getLogoOverlayStyle(branding.brandLogoPosition || 'bottom-right')}
              />
            )}
          </div>
        </div>

        {/* Footer Meta */}
        <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><User size={10} />{current.uploadedBy?.name || 'Unknown'}</span>
            <span className="flex items-center gap-1"><Calendar size={10} />{new Date(current.createdAt).toLocaleDateString()}</span>
            <span className="flex items-center gap-1"><HardDrive size={10} />{formatSize(current.size)}</span>
          </div>
          {assets.length > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={prev} disabled={idx === 0} className="btn-ghost p-1.5 disabled:opacity-30"><ChevronLeft size={14} /></button>
              <span className="text-[10px] text-gray-500">{idx + 1} / {assets.length}</span>
              <button onClick={next} disabled={idx === assets.length - 1} className="btn-ghost p-1.5 disabled:opacity-30"><ChevronRight size={14} /></button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── AI Image Card ────────────────────────────────────────────────────────────
function AIImageCard({ asset, onPreview, onDelete, onDownload }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative glass-card overflow-hidden cursor-pointer"
      onClick={() => onPreview(asset)}
    >
      {/* Image */}
      <div className="aspect-square bg-dark-700 overflow-hidden">
        <img
          src={asset.url}
          alt={asset.originalName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </div>

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Eye size={12} className="text-white" />
          <span className="text-[10px] text-white font-medium">Preview</span>
        </div>
        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          <button onClick={(e) => { e.stopPropagation(); onDownload(asset); }} className="flex items-center gap-1 text-[10px] text-white/70 hover:text-white bg-white/10 rounded-md px-2 py-1 transition-colors">
            <Download size={10} /> Save
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(asset.id); }} className="flex items-center gap-1 text-[10px] text-red-300 hover:text-red-200 bg-red-500/20 rounded-md px-2 py-1 transition-colors">
            <Trash2 size={10} /> Delete
          </button>
        </div>
      </div>

      {/* AI Badge */}
      <div className="absolute top-2 left-2">
        <span className="flex items-center gap-1 text-[9px] font-bold text-purple-300 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-purple-500/20">
          <Sparkles size={8} /> AI
        </span>
      </div>

      {/* Prompt label at bottom */}
      <div className="p-2.5 border-t border-white/5">
        <p className="text-[10px] text-gray-400 truncate leading-relaxed">{asset.originalName.replace('AI: ', '').replace('.png', '')}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[9px] text-gray-600 flex items-center gap-1">
            <User size={8} />{asset.uploadedBy?.name || 'Unknown'}
          </span>
          <span className="text-[9px] text-gray-600">
            {new Date(asset.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Regular Asset Card ───────────────────────────────────────────────────────
function AssetCard({ asset, onPreview, onDelete, onSetCover, onDownload, branding }) {
  const Icon = typeIcons[asset.type] || FileText;
  const isPreviewable = asset.type === 'IMAGE' || asset.type === 'VIDEO';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-card p-4 group hover:border-white/10 transition-all"
    >
      {asset.coverPhoto && (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 mb-2">
          Cover
        </span>
      )}
      {/* Thumbnail for images */}
      {asset.type === 'IMAGE' ? (
        <div
          className="w-full aspect-video rounded-xl overflow-hidden bg-dark-700 mb-3 cursor-pointer relative"
          onClick={() => onPreview(asset)}
        >
          <img src={asset.url} alt={asset.originalName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          {branding?.brandLogoEnabled && branding?.brandLogoUrl && (
            <img src={branding.brandLogoUrl} alt="Brand logo" style={getLogoOverlayStyle(branding.brandLogoPosition || 'bottom-right')} className="pointer-events-none" />
          )}
        </div>
      ) : (
        <div className={`relative w-10 h-10 rounded-xl ${typeBg[asset.type] || 'bg-gray-500/10'} flex items-center justify-center mb-3`}>
          <Icon size={20} className={typeColors[asset.type]} />
          {branding?.brandLogoEnabled && branding?.brandLogoUrl && (
            <img src={branding.brandLogoUrl} alt="Brand logo" style={{ ...getLogoOverlayStyle(branding.brandLogoPosition || 'bottom-right'), width: '26px', height: '26px', padding: '4px' }} className="pointer-events-none" />
          )}
        </div>
      )}

      <p className="text-xs font-medium text-white truncate">{asset.originalName}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] text-gray-500">{formatSize(asset.size)}</span>
        <span className="text-[10px] text-gray-600">•</span>
        <span className="text-[10px] text-gray-500 flex items-center gap-1">
          <User size={8} />{asset.uploadedBy?.name || 'Unknown'}
        </span>
      </div>
      <p className="text-[10px] text-gray-600 mt-0.5">{new Date(asset.createdAt).toLocaleDateString()}</p>

      <div className="flex items-center gap-1.5 mt-3 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
        {isPreviewable && (
          <button onClick={() => onPreview(asset)} className="btn-ghost text-[10px] flex items-center gap-1 px-2 py-1">
            <Eye size={10} /> Preview
          </button>
        )}
        {(asset.type === 'IMAGE' || asset.type === 'VIDEO') && (
          <button onClick={() => onSetCover(asset.id)} className="btn-ghost text-[10px] flex items-center gap-1 px-2 py-1">
            <Sparkles size={10} /> Set cover
          </button>
        )}
        <button onClick={() => onDownload(asset)} className="btn-ghost text-[10px] flex items-center gap-1 px-2 py-1">
          <Download size={10} /> Download
        </button>
        <button onClick={() => onDelete(asset.id)} className="btn-ghost text-[10px] text-red-400 flex items-center gap-1 px-2 py-1">
          <Trash2 size={10} /> Delete
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activeFolder, setActiveFolder] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [previewAsset, setPreviewAsset] = useState(null);
  const [branding, setBranding] = useState({ brandLogoUrl: '', brandLogoPosition: 'bottom-right', brandLogoEnabled: true });

  useEffect(() => { loadAssets(); loadBranding(); }, [search, typeFilter, activeFolder]);

  const loadBranding = async () => {
    try {
      const res = await api.get('/settings');
      setBranding({
        brandLogoUrl: res.data.brandLogoUrl || res.data.companyLogoUrl || '',
        brandLogoPosition: res.data.brandLogoPosition || res.data.logoPosition || 'bottom-right',
        brandLogoEnabled: res.data.brandLogoEnabled !== undefined ? Boolean(res.data.brandLogoEnabled) : true
      });
    } catch {
      // no branding configured yet
    }
  };

  const loadAssets = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)     params.search = search;
      if (typeFilter) params.type   = typeFilter;
      if (activeFolder !== 'all') params.folder = activeFolder;
      const res = await api.get('/uploads/assets', { params });
      setAssets(res.data);
    } catch {
      toast.error('Failed to load assets');
    }
    setLoading(false);
  };

  const uploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'general');
    try {
      await api.post('/uploads/assets', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Asset uploaded!');
      loadAssets();
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Upload failed';
      toast.error(`Upload failed: ${message}`);
    }
    setUploading(false);
    e.target.value = '';
  };

  const downloadAsset = async (asset) => {
    try {
      const response = await api.get(`/uploads/assets/${asset.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = asset.originalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Download failed';
      toast.error(message);
    }
  };

  const deleteAsset = async (id) => {
    if (!window.confirm('Delete this asset?')) return;
    try {
      await api.delete(`/uploads/assets/${id}`);
      setAssets(prev => prev.filter(a => a.id !== id));
      if (previewAsset?.id === id) setPreviewAsset(null);
      toast.success('Asset deleted');
    } catch { toast.error('Delete failed'); }
  };

  const setCoverAsset = async (id) => {
    try {
      await api.put(`/uploads/assets/${id}/cover`);
      await loadAssets();
      toast.success('Cover image updated');
    } catch {
      toast.error('Failed to update cover photo');
    }
  };

  // Counts per folder
  const aiCount = assets.filter(a => a.folder === 'ai-generated').length;

  const isAIFolder = activeFolder === 'ai-generated';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Asset Library</h1>
          <p className="text-xs text-gray-500">{assets.length} files{activeFolder !== 'all' ? ` in ${FOLDERS.find(f => f.key === activeFolder)?.label}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAIFolder && (
            <div className="flex items-center gap-1.5 text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1.5 rounded-lg">
              <Sparkles size={11} /> AI Generated Images
            </div>
          )}
          <label className="btn-primary text-sm flex items-center gap-2 cursor-pointer">
            {uploading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Upload size={14} />
            }
            Upload
            <input type="file" className="hidden" onChange={uploadFile} />
          </label>
        </div>
      </div>

      {/* Folder Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {FOLDERS.map(folder => {
          const Icon = folder.icon;
          const isActive = activeFolder === folder.key;
          return (
            <button
              key={folder.key}
              onClick={() => setActiveFolder(folder.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border
                ${isActive
                  ? folder.key === 'ai-generated'
                    ? 'bg-purple-600/10 border-purple-500/30 text-purple-300'
                    : 'bg-brand-600/10 border-brand-500/30 text-brand-300'
                  : 'bg-dark-700/50 border-white/5 text-gray-400 hover:bg-dark-600/50 hover:text-gray-300'
                }`}
            >
              <Icon size={13} className={isActive ? folder.color : 'text-gray-500'} />
              {folder.label}
              {folder.key === 'ai-generated' && aiCount > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${isActive ? 'bg-purple-500/20 text-purple-300' : 'bg-dark-500 text-gray-500'}`}>
                  {aiCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search + Type Filter */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search files..." className="input-field pl-9 py-2.5 text-sm"
          />
        </div>
        <div className="flex gap-1.5">
          {TYPE_FILTERS.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`chip text-xs ${typeFilter === t ? 'chip-active' : 'chip-inactive'}`}>
              {t || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className={`grid gap-3 ${isAIFolder ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card animate-pulse">
              <div className="aspect-square bg-dark-600 rounded-xl mb-3" />
              <div className="h-3 bg-dark-600 rounded w-3/4 mb-1.5" />
              <div className="h-2 bg-dark-600 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* AI Generated Grid — full image preview */}
      {!loading && isAIFolder && (
        <>
          {assets.length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-px flex-1 bg-purple-500/10" />
                <span className="text-[10px] text-purple-400/60 font-medium flex items-center gap-1">
                  <Bot size={10} /> Generated by your team with DALL-E 3
                </span>
                <div className="h-px flex-1 bg-purple-500/10" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {assets.map(asset => (
                  asset.type === 'IMAGE'
                    ? <AIImageCard key={asset.id} asset={asset} onPreview={setPreviewAsset} onDelete={deleteAsset} onDownload={downloadAsset} />
                    : <AssetCard key={asset.id} asset={asset} onPreview={setPreviewAsset} onDelete={deleteAsset} onSetCover={setCoverAsset} onDownload={downloadAsset} branding={branding} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-4">
                <Sparkles size={28} className="text-purple-400" />
              </div>
              <p className="text-sm font-medium text-gray-400">No AI images yet</p>
              <p className="text-xs text-gray-600 mt-1">Generate images in the AI Assistant and they'll appear here</p>
              <a href="/ai" className="inline-flex items-center gap-2 mt-4 btn-primary text-xs px-4 py-2">
                <Bot size={13} /> Go to AI Assistant
              </a>
            </div>
          )}
        </>
      )}

      {/* Regular Asset Grid */}
      {!loading && !isAIFolder && (
        <>
          {assets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {assets.map(asset => (
                <AssetCard key={asset.id} asset={asset} onPreview={setPreviewAsset} onDelete={deleteAsset} onSetCover={setCoverAsset} onDownload={downloadAsset} branding={branding} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <FolderOpen size={40} className="text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No assets found</p>
              <p className="text-xs text-gray-600 mt-1">Upload PDFs, videos, images, and voice notes</p>
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {previewAsset && (
          <Lightbox
            asset={previewAsset}
            assets={assets.filter(a => a.type === 'IMAGE' || a.type === 'VIDEO')}
            onClose={() => setPreviewAsset(null)}
            onDownload={downloadAsset}
            branding={branding}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
