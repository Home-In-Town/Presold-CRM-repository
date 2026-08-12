import { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileText, X, Image, Video, Send, Trash2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ContentCreator() {
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const loadAssets = async () => {
    try {
      const res = await api.get('/uploads/assets?folder=content');
      setUploads(res.data || []);
    } catch {}
  };

  useEffect(() => { loadAssets(); }, []);

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    if (selected.type.startsWith('image/') || selected.type.startsWith('video/')) {
      setPreview(URL.createObjectURL(selected));
    } else {
      setPreview(null);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (preview) { URL.revokeObjectURL(preview); setPreview(null); }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file && !caption.trim()) {
      return toast.error('Add a photo/video or write a caption');
    }
    setLoading(true);
    try {
      if (file) {
        // Upload media with caption as tags metadata
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'content');
        fd.append('tags', JSON.stringify(['content', ...(caption.trim() ? ['has-caption'] : [])]));
        // If there's a caption, store it in the original name for reference
        if (caption.trim()) {
          const ext = file.name.split('.').pop();
          const captionFile = new File([file], `${caption.trim().slice(0, 60).replace(/[^a-z0-9\s]/gi, '')}.${ext}`, { type: file.type });
          fd.set('file', captionFile);
        }
        await api.post('/uploads/assets', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Content uploaded successfully');
      } else if (caption.trim()) {
        // Caption only — save as text file
        const blob = new Blob([caption], { type: 'text/plain' });
        const fd = new FormData();
        fd.append('file', blob, `caption_${Date.now()}.txt`);
        fd.append('folder', 'content');
        fd.append('tags', JSON.stringify(['caption', 'text']));
        await api.post('/uploads/assets', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Caption saved');
      }
      setCaption('');
      removeFile();
      loadAssets();
    } catch {
      toast.error('Upload failed');
    }
    setLoading(false);
  };

  const isVideo = file?.type?.startsWith('video/');
  const isImage = file?.type?.startsWith('image/');

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText size={18} /> Content Creator
        </h1>
        <p className="text-xs text-gray-500">Uploads are shared to Assets for all users.</p>
      </div>

      {/* Upload Card */}
      <div className="glass-card p-5 space-y-4">
        {/* File Upload Area */}
        {!file ? (
          <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-pink-500/40 hover:bg-pink-500/5 transition-all">
            <div className="w-14 h-14 rounded-full bg-pink-500/10 flex items-center justify-center">
              <UploadCloud size={24} className="text-pink-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white">Upload Photo or Video</p>
              <p className="text-xs text-gray-500 mt-1">Click to browse or drag & drop</p>
              <p className="text-[10px] text-gray-600 mt-0.5">JPG, PNG, MP4, MOV up to 100MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
          </label>
        ) : (
          <div className="relative rounded-xl overflow-hidden bg-dark-900 border border-white/10">
            {isImage && preview && (
              <img src={preview} alt="Preview" className="w-full max-h-64 object-contain" />
            )}
            {isVideo && preview && (
              <video src={preview} controls className="w-full max-h-64" />
            )}
            {!isImage && !isVideo && (
              <div className="p-6 flex items-center gap-3">
                <FileText size={20} className="text-gray-400" />
                <span className="text-sm text-gray-300">{file.name}</span>
              </div>
            )}
            <button onClick={removeFile} className="absolute top-2 right-2 p-1.5 rounded-full bg-dark-800/80 border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 transition-colors">
              <X size={14} className="text-gray-400 hover:text-red-400" />
            </button>
            <div className="px-4 py-2 bg-dark-800/50 border-t border-white/5 flex items-center gap-2">
              {isImage && <Image size={12} className="text-green-400" />}
              {isVideo && <Video size={12} className="text-blue-400" />}
              <span className="text-[11px] text-gray-400 truncate">{file.name}</span>
              <span className="text-[10px] text-gray-600 ml-auto">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
            </div>
          </div>
        )}

        {/* Caption */}
        <div>
          <label className="text-[11px] text-gray-400 mb-1.5 block">Caption / Description</label>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            rows={4}
            className="input-field text-sm"
            placeholder="Write your caption, script, or description here..."
          />
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={loading || (!file && !caption.trim())}
          className="w-full btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-40"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={15} />
          )}
          {loading ? 'Uploading...' : file ? 'Upload Content' : 'Save Caption'}
        </button>
      </div>

      {/* Recent Uploads */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Recent Content Uploads</h3>
        {uploads.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-6">No uploads yet. Start creating content!</p>
        ) : (
          <div className="space-y-2">
            {uploads.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-dark-900/50 border border-white/5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  a.type === 'IMAGE' ? 'bg-green-500/10' : a.type === 'VIDEO' ? 'bg-blue-500/10' : 'bg-gray-500/10'
                }`}>
                  {a.type === 'IMAGE' && <Image size={16} className="text-green-400" />}
                  {a.type === 'VIDEO' && <Video size={16} className="text-blue-400" />}
                  {a.type !== 'IMAGE' && a.type !== 'VIDEO' && <FileText size={16} className="text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 font-medium truncate">{a.originalName}</p>
                  <p className="text-[10px] text-gray-500">By {a.uploadedBy?.name || 'Unknown'} • {new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
                <span className="text-[10px] text-gray-600">{(a.size / 1024 / 1024).toFixed(1)} MB</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
