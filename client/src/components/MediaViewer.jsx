import { useState } from 'react';
import { X, Download, Share2, ZoomIn, ZoomOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { resolveFileUrl } from '../services/api';
import toast from 'react-hot-toast';

export default function MediaViewer({ media, onClose }) {
  const [zoom, setZoom] = useState(1);
  
  if (!media) return null;

  const { url, type, title, addedBy } = media;
  const fullUrl = resolveFileUrl(url);

  const handleDownload = async () => {
    try {
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = title || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const handleShare = async () => {
    // Try WhatsApp first
    try {
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const file = new File([blob], title || 'shared-file', { type: blob.type });
      
      // Check if Web Share API supports files
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: title || 'Shared Media',
          text: `Check out this ${type}`,
          files: [file]
        });
        toast.success('Shared successfully!');
      } else {
        // Fallback: Show share options dialog
        showShareOptions();
      }
    } catch (error) {
      // If share fails, show options
      showShareOptions();
    }
  };

  const showShareOptions = () => {
    // Create WhatsApp share link
    const whatsappText = encodeURIComponent(`Check out this ${type}: ${fullUrl}`);
    const whatsappUrl = `https://wa.me/?text=${whatsappText}`;
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
    toast.success('Opening WhatsApp...');
  };

  const copyLinkToClipboard = () => {
    navigator.clipboard.writeText(fullUrl);
    toast.success('Link copied to clipboard!');
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full h-full flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div>
              <h3 className="text-white font-semibold">{title || 'Media'}</h3>
              {addedBy && (
                <p className="text-xs text-gray-400 mt-1">
                  Added by: {addedBy.name || 'Unknown'}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Zoom Controls - Only for images */}
              {type === 'image' && (
                <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-1">
                  <button
                    onClick={handleZoomOut}
                    className="p-2 hover:bg-white/10 rounded transition-colors"
                    disabled={zoom <= 0.5}
                  >
                    <ZoomOut size={18} className="text-white" />
                  </button>
                  <span className="text-xs text-gray-400 px-2 min-w-[50px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="p-2 hover:bg-white/10 rounded transition-colors"
                    disabled={zoom >= 3}
                  >
                    <ZoomIn size={18} className="text-white" />
                  </button>
                </div>
              )}
              
              {/* Action Buttons */}
              <button
                onClick={handleDownload}
                className="p-2 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors"
                title="Download"
              >
                <Download size={20} className="text-white" />
              </button>
              <button
                onClick={handleShare}
                className="p-2 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors"
                title="Share"
              >
                <Share2 size={20} className="text-white" />
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors"
                title="Close"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
          </div>

          {/* Media Content */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            {type === 'image' && (
              <motion.img
                src={fullUrl}
                alt={title}
                className="max-w-full max-h-full object-contain"
                style={{ transform: `scale(${zoom})` }}
                transition={{ duration: 0.2 }}
              />
            )}
            
            {type === 'video' && (
              <video
                src={fullUrl}
                controls
                className="max-w-full max-h-full"
                autoPlay
              >
                Your browser does not support video playback.
              </video>
            )}
            
            {type === 'pdf' && (
              <iframe
                src={fullUrl}
                className="w-full h-full border-0"
                title={title}
              />
            )}

            {type === 'audio' && (
              <div className="bg-dark-800 rounded-xl p-8 max-w-md w-full">
                <audio
                  src={fullUrl}
                  controls
                  className="w-full"
                  autoPlay
                >
                  Your browser does not support audio playback.
                </audio>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
