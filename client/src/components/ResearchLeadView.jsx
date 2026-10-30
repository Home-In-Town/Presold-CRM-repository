import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Upload, Image as ImageIcon, Video, FileIcon,
  Save, Trash2, Download, Loader2, X, Camera, File
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Camera as CapacitorCamera } from '@capacitor/camera';
import { CameraResultType, CameraSource } from '@capacitor/camera';

export default function ResearchLeadView({ lead, onUpdate }) {
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadNotes();
    loadAttachments();
  }, [lead.id]);

  const loadNotes = async () => {
    try {
      const res = await api.get(`/leads/${lead.id}`);
      // Extract notes from lead notes
      if (res.data.notes && res.data.notes.length > 0) {
        // Get the most recent note
        const latestNote = res.data.notes[0];
        setNotes(latestNote.content || '');
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  };

  const loadAttachments = async () => {
    try {
      const res = await api.get(`/leads/${lead.id}/attachments`);
      setAttachments(res.data || []);
    } catch (err) {
      // Endpoint might not exist yet
      console.log('Attachments not available');
      setAttachments([]);
    }
  };

  const saveNotes = async () => {
    if (!notes.trim()) {
      toast.error('Please write something first');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/leads/${lead.id}/notes`, { content: notes });
      toast.success('Notes saved successfully');
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error('Failed to save notes');
    } finally {
      setLoading(false);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });

      if (image.webPath) {
        await uploadFile(image.webPath, 'image', `photo_${Date.now()}.jpg`);
      }
    } catch (err) {
      if (err.message !== 'User cancelled photos app') {
        toast.error('Failed to capture photo');
      }
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      await uploadFile(event.target.result, file.type, file.name);
    };
    reader.readAsDataURL(file);
  };

  const uploadFile = async (dataUrl, mimeType, fileName) => {
    setUploading(true);
    try {
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('file', blob, fileName);
      formData.append('type', mimeType.startsWith('image/') ? 'photo' : mimeType.startsWith('video/') ? 'video' : 'document');

      await api.post(`/leads/${lead.id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('File uploaded successfully');
      await loadAttachments();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const deleteAttachment = async (id) => {
    if (!confirm('Delete this attachment?')) return;

    try {
      await api.delete(`/leads/${lead.id}/attachments/${id}`);
      toast.success('Attachment deleted');
      await loadAttachments();
    } catch (err) {
      toast.error('Failed to delete attachment');
    }
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return <ImageIcon size={20} />;
    if (type?.startsWith('video/')) return <Video size={20} />;
    return <FileIcon size={20} />;
  };

  const getFileUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const base = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
    return `${base}${url}`;
  };

  // Parse research data from lead notes
  const researchInfo = lead.notes?.[0]?.content || '';
  const parsedTags = lead.tags ? JSON.parse(lead.tags) : [];

  return (
    <div className="space-y-6">
      {/* Lead Information Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 border-l-4 border-pink-500"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText size={24} className="text-pink-400" />
            Research Lead Information
          </h2>
          <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-400 text-xs font-semibold">
            RESEARCH DATA
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Lead Name</p>
            <p className="text-sm text-white font-medium">{lead.fullName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Company</p>
            <p className="text-sm text-white font-medium">{lead.company || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Role</p>
            <p className="text-sm text-white font-medium capitalize">
              {parsedTags[1] || 'Unknown'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Source</p>
            <p className="text-sm text-white font-medium">{lead.source || 'N/A'}</p>
          </div>
          {lead.location && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Location</p>
              <p className="text-sm text-white font-medium">{lead.location}</p>
            </div>
          )}
        </div>

        {/* Research Data Details */}
        {researchInfo && (
          <div className="mt-4 p-4 bg-dark-700/50 rounded-lg">
            <p className="text-xs text-gray-400 mb-2 font-semibold">📋 Research Details:</p>
            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
              {researchInfo}
            </pre>
          </div>
        )}
      </motion.div>

      {/* Notes Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <FileText size={20} className="text-brand-400" />
          Notes
        </h3>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Write your notes here... (observations, follow-ups, action items, etc.)"
          className="w-full h-40 px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none text-sm"
        />

        <div className="flex justify-end mt-3">
          <button
            onClick={saveNotes}
            disabled={loading || !notes.trim()}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-medium transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Notes
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* File Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Upload size={20} className="text-purple-400" />
          Attachments
        </h3>

        {/* Upload Buttons */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={handleCameraCapture}
            disabled={uploading}
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 border border-blue-500/30 transition-all disabled:opacity-50"
          >
            <Camera size={24} className="text-blue-400" />
            <span className="text-xs text-blue-300 font-medium">Take Photo</span>
          </button>

          <label className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 hover:from-purple-500/30 hover:to-purple-600/30 border border-purple-500/30 transition-all cursor-pointer">
            <ImageIcon size={24} className="text-purple-400" />
            <span className="text-xs text-purple-300 font-medium">Upload Photo</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
          </label>

          <label className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gradient-to-br from-pink-500/20 to-pink-600/20 hover:from-pink-500/30 hover:to-pink-600/30 border border-pink-500/30 transition-all cursor-pointer">
            <File size={24} className="text-pink-400" />
            <span className="text-xs text-pink-300 font-medium">Upload File</span>
            <input
              type="file"
              accept="image/*,video/*,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        {uploading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={24} className="animate-spin text-brand-400" />
            <span className="ml-2 text-sm text-gray-400">Uploading...</span>
          </div>
        )}

        {/* Attachments List */}
        {attachments.length > 0 ? (
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg hover:bg-dark-700 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-gray-400">
                    {getFileIcon(attachment.mimeType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {attachment.fileName || 'Unnamed file'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(attachment.createdAt).toLocaleDateString()} • 
                      {attachment.type || 'file'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={getFileUrl(attachment.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-brand-400"
                  >
                    <Download size={16} />
                  </a>
                  <button
                    onClick={() => deleteAttachment(attachment.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-gray-400 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">
            No attachments yet. Upload photos, videos, or documents.
          </div>
        )}
      </motion.div>
    </div>
  );
}
