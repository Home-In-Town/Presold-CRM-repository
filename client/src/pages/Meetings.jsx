import { useState, useEffect } from 'react';
import { Calendar, MapPin, User, Clock, Phone, Building2, Plus, Filter, Search, ChevronDown, ChevronUp, Volume2, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import AddMeetingModal from '../components/AddMeetingModal';

export default function Meetings() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, upcoming, past
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedMeetingId, setExpandedMeetingId] = useState(null);

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const endpoint = user?.role === 'ADMIN' ? '/meetings/admin/all' : '/meetings';
      console.log('Loading meetings from:', endpoint);
      const res = await api.get(endpoint);
      console.log('Meetings response:', res.data);
      setMeetings(res.data.meetings || []);
    } catch (err) {
      console.error('Failed to load meetings:', err);
      console.error('Error details:', err.response?.data);
      toast.error(err.response?.data?.error || 'Failed to load meetings');
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMeetingSuccess = () => {
    setShowAddModal(false);
    loadMeetings(); // Reload meetings after successful creation
  };

  const handleDelete = async (meetingId) => {
    if (!window.confirm('Are you sure you want to delete this meeting? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/meetings/${meetingId}`);
      toast.success('Meeting deleted successfully');
      loadMeetings(); // Reload the list
    } catch (err) {
      console.error('Failed to delete meeting:', err);
      toast.error(err.response?.data?.error || 'Failed to delete meeting');
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getMeetingStatus = (meetingDateTime) => {
    if (!meetingDateTime) return { label: 'Scheduled', color: 'text-gray-400' };
    const meetingDate = new Date(meetingDateTime);
    const now = new Date();
    const diffHours = (meetingDate - now) / (1000 * 60 * 60);

    if (diffHours < 0) return { label: 'Completed', color: 'text-gray-500' };
    if (diffHours < 2) return { label: 'Upcoming Soon', color: 'text-yellow-400' };
    if (diffHours < 24) return { label: 'Today', color: 'text-green-400' };
    return { label: 'Upcoming', color: 'text-blue-400' };
  };

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = searchQuery === '' || 
      meeting.personName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.officeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.officeAddress?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'all') return true;
    
    const status = getMeetingStatus(meeting.meetingDateTime);
    if (filter === 'upcoming') {
      return status.label !== 'Completed';
    }
    if (filter === 'past') {
      return status.label === 'Completed';
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
          <p className="mt-4 text-sm text-gray-400">Loading meetings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Meetings</h1>
          <p className="text-sm text-gray-400 mt-1">
            {user?.role === 'ADMIN' ? 'All team meetings' : 'Your scheduled meetings'}
          </p>
        </div>
        {/* Only show Add Meeting button if user is not ADMIN */}
        {user?.role !== 'ADMIN' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            <span>Add Meeting</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search by person, office, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 bg-dark-800 p-1 rounded-lg">
          {[
            { id: 'all', label: 'All' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'past', label: 'Past' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === tab.id
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {user?.role === 'ADMIN' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-dark-800 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Calendar className="text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{meetings.length}</p>
                <p className="text-xs text-gray-400">Total Meetings</p>
              </div>
            </div>
          </div>
          <div className="bg-dark-800 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Clock className="text-green-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {meetings.filter(m => getMeetingStatus(m.meetingDateTime).label !== 'Completed').length}
                </p>
                <p className="text-xs text-gray-400">Upcoming</p>
              </div>
            </div>
          </div>
          <div className="bg-dark-800 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center">
                <User className="text-gray-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {meetings.filter(m => getMeetingStatus(m.meetingDateTime).label === 'Completed').length}
                </p>
                <p className="text-xs text-gray-400">Completed</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meetings List */}
      <div className="space-y-3">
        {filteredMeetings.length === 0 ? (
          <div className="bg-dark-800 rounded-xl p-12 text-center border border-white/5">
            <Calendar className="mx-auto text-gray-600 mb-4" size={48} />
            <p className="text-gray-400">
              {searchQuery ? 'No meetings found matching your search' : 'No meetings scheduled yet'}
            </p>
          </div>
        ) : (
          filteredMeetings.map((meeting, index) => {
            const status = getMeetingStatus(meeting.meetingDateTime);
            const isExpanded = expandedMeetingId === meeting.id;
            
            return (
              <motion.div
                key={meeting.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-dark-800 rounded-xl border border-white/5 hover:border-white/10 transition-colors overflow-hidden"
              >
                {/* Main Info - Always Visible */}
                <div className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Meeting Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white">
                              {meeting.personName || 'Not specified'}
                            </h3>
                            <span className={`text-xs font-medium ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                          {meeting.role && (
                            <p className="text-sm text-gray-400">{meeting.role}</p>
                          )}
                        </div>
                        
                        {/* Delete Button - Show for own meetings or if admin */}
                        {(meeting.userId === user?.id || user?.role === 'ADMIN') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(meeting.id);
                            }}
                            className="p-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-colors"
                            title="Delete meeting"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        {meeting.officeName && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <Building2 size={16} className="text-gray-500 flex-shrink-0" />
                            <span className="truncate">{meeting.officeName}</span>
                          </div>
                        )}
                        {meeting.personContact && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <Phone size={16} className="text-gray-500 flex-shrink-0" />
                            <span>{meeting.personContact}</span>
                          </div>
                        )}
                        {meeting.meetingDateTime && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <Clock size={16} className="text-gray-500 flex-shrink-0" />
                            <span>{formatDateTime(meeting.meetingDateTime)}</span>
                          </div>
                        )}
                        {meeting.officeAddress && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <MapPin size={16} className="text-gray-500 flex-shrink-0" />
                            <span className="truncate">{meeting.officeAddress}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Selfie Preview */}
                    {meeting.selfieUrl && (
                      <div className="flex-shrink-0">
                        <img
                          src={meeting.selfieUrl}
                          alt="Meeting selfie"
                          className="w-16 h-16 rounded-lg object-cover border border-white/10"
                        />
                      </div>
                    )}
                  </div>

                  {/* View Details Button */}
                  <button
                    onClick={() => setExpandedMeetingId(isExpanded ? null : meeting.id)}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-sm text-gray-300"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp size={16} />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronDown size={16} />
                        View Details
                      </>
                    )}
                  </button>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/5 bg-dark-900/50"
                  >
                    <div className="p-5 space-y-4">
                      {/* Audio Recording */}
                      {meeting.audioUrl && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Volume2 size={16} className="text-brand-400" />
                            <h4 className="text-sm font-medium text-white">Audio Recording</h4>
                            {meeting.audioDuration && (
                              <span className="text-xs text-gray-500">
                                ({Math.floor(meeting.audioDuration / 60)}:{(meeting.audioDuration % 60).toString().padStart(2, '0')} min)
                              </span>
                            )}
                          </div>
                          <audio controls className="w-full" src={meeting.audioUrl}>
                            Your browser does not support audio playback.
                          </audio>
                        </div>
                      )}

                      {/* Visiting Card */}
                      {meeting.visitingCardUrl && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <ImageIcon size={16} className="text-purple-400" />
                            <h4 className="text-sm font-medium text-white">Visiting Card</h4>
                          </div>
                          <img
                            src={meeting.visitingCardUrl}
                            alt="Visiting card"
                            className="w-full max-w-md rounded-lg border border-white/10"
                          />
                        </div>
                      )}

                      {/* Notes */}
                      {meeting.placeNote && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <FileText size={16} className="text-green-400" />
                            <h4 className="text-sm font-medium text-white">Notes</h4>
                          </div>
                          <p className="text-sm text-gray-300 bg-dark-800 p-3 rounded-lg">
                            {meeting.placeNote}
                          </p>
                        </div>
                      )}

                      {/* Conversation */}
                      {meeting.conversation && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <FileText size={16} className="text-blue-400" />
                            <h4 className="text-sm font-medium text-white">Conversation</h4>
                          </div>
                          <p className="text-sm text-gray-300 bg-dark-800 p-3 rounded-lg whitespace-pre-wrap">
                            {meeting.conversation}
                          </p>
                        </div>
                      )}

                      {/* Location */}
                      {(meeting.latitude || meeting.longitude) && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin size={16} className="text-red-400" />
                            <h4 className="text-sm font-medium text-white">Location Coordinates</h4>
                          </div>
                          <p className="text-sm text-gray-400">
                            {meeting.latitude}, {meeting.longitude}
                          </p>
                          {meeting.latitude && meeting.longitude && (
                            <a
                              href={`https://www.google.com/maps?q=${meeting.latitude},${meeting.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-brand-400 hover:text-brand-300 inline-block mt-1"
                            >
                              View on Google Maps →
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Add Meeting Modal */}
      {showAddModal && (
        <AddMeetingModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleMeetingSuccess}
        />
      )}
    </div>
  );
}
