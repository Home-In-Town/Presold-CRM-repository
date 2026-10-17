import { useState, useEffect } from 'react';
import { Calendar, MapPin, User, Clock, Phone, Building2, Plus, Filter, Search } from 'lucide-react';
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
            return (
              <motion.div
                key={meeting.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-dark-800 rounded-xl p-5 border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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
