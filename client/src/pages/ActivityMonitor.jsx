import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, Users, TrendingUp, Calendar, RefreshCw, 
  FileText, Target, MessageSquare, FolderOpen, Send,
  ChevronRight, Eye, Download
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ActivityMonitor() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liveData, setLiveData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadLiveData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadLiveData, 30000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  const loadLiveData = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      
      const res = await api.get('/activity-monitor/live', {
        params: { date: selectedDate }
      });
      setLiveData(res.data);
    } catch (err) {
      toast.error('Failed to load activity data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUserDetails = async (userId) => {
    try {
      setDetailsLoading(true);
      setSelectedUser(userId);
      
      const res = await api.get(`/activity-monitor/user/${userId}`, {
        params: { date: selectedDate }
      });
      setUserDetails(res.data);
    } catch (err) {
      toast.error('Failed to load user details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const sendToWhatsApp = async (userId, userName) => {
    try {
      toast.loading('Generating WhatsApp report...');
      
      const res = await api.get(`/activity-monitor/whatsapp/${userId}`, {
        params: { date: selectedDate }
      });
      
      toast.dismiss();
      toast.success('Opening WhatsApp...');
      
      // Open WhatsApp with pre-filled message
      window.open(res.data.whatsappUrl, '_blank');
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to generate WhatsApp report');
    }
  };

  const copyReport = async (userId) => {
    try {
      const res = await api.get(`/activity-monitor/whatsapp/${userId}`, {
        params: { date: selectedDate }
      });
      
      await navigator.clipboard.writeText(res.data.text);
      toast.success('Report copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy report');
    }
  };

  if (loading && !liveData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading activity monitor...</p>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      label: 'Total Activities',
      value: liveData?.totals.total || 0,
      icon: Activity,
      color: 'bg-brand-500',
      change: '+12%'
    },
    {
      label: 'Leads Created',
      value: liveData?.totals.leads || 0,
      icon: Target,
      color: 'bg-green-500',
      change: '+8%'
    },
    {
      label: 'Meetings Scheduled',
      value: liveData?.totals.meetings || 0,
      icon: MessageSquare,
      color: 'bg-blue-500',
      change: '+15%'
    },
    {
      label: 'Projects Added',
      value: liveData?.totals.projects || 0,
      icon: FolderOpen,
      color: 'bg-purple-500',
      change: '+5%'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="text-brand-400" size={28} />
            Activity Monitor
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time user activity tracking • Auto-updates every 30 seconds
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Picker */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="px-4 py-2 bg-dark-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"
          />

          {/* Refresh Button */}
          <button
            onClick={() => loadLiveData(true)}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-dark-800 border border-white/5 rounded-xl p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon size={24} className="text-white" />
              </div>
              <span className="text-xs text-green-400 font-semibold">
                {stat.change}
              </span>
            </div>
            <div>
              <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Activity Indicator */}
      <div className="bg-dark-800 border border-white/5 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <div>
              <p className="text-sm font-semibold text-white">
                {liveData?.activeUsers || 0} Active Users Today
              </p>
              <p className="text-xs text-gray-400">
                {liveData?.totalUsers || 0} total team members
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* User Activity List */}
      <div className="bg-dark-800 border border-white/5 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users size={20} className="text-brand-400" />
            Team Activity Breakdown
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Click on any user to view detailed activity report
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-900/50 border-b border-white/5">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                  User
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase">
                  <div className="flex items-center justify-center gap-1">
                    <Target size={14} />
                    Leads
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase">
                  <div className="flex items-center justify-center gap-1">
                    <MessageSquare size={14} />
                    Meetings
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase">
                  <div className="flex items-center justify-center gap-1">
                    <FolderOpen size={14} />
                    Projects
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {liveData?.userActivities.map((item) => (
                <tr 
                  key={item.user.id}
                  className="hover:bg-dark-900/30 transition-colors cursor-pointer"
                  onClick={() => loadUserDetails(item.user.id)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.user.avatar ? (
                        <img 
                          src={item.user.avatar} 
                          alt={item.user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center">
                          <span className="text-brand-400 font-semibold text-sm">
                            {item.user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-white">{item.user.name}</p>
                        <p className="text-xs text-gray-400">{item.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/10 text-green-400 font-semibold text-sm">
                      {item.activities.leads}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 font-semibold text-sm">
                      {item.activities.meetings}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 font-semibold text-sm">
                      {item.activities.projects}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-brand-500/20 text-brand-400 font-bold text-sm">
                      {item.activities.total}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          loadUserDetails(item.user.id);
                        }}
                        className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 border border-white/10 text-gray-400 hover:text-white transition-colors"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          sendToWhatsApp(item.user.id, item.user.name);
                        }}
                        className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 transition-colors"
                        title="Send to WhatsApp"
                      >
                        <Send size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyReport(item.user.id);
                        }}
                        className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 border border-white/10 text-gray-400 hover:text-white transition-colors"
                        title="Copy Report"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {liveData?.userActivities.length === 0 && (
          <div className="p-12 text-center">
            <Activity size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No activity recorded for this date</p>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && userDetails && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setSelectedUser(null);
            setUserDetails(null);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-dark-800 border border-white/10 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {userDetails.user.avatar ? (
                  <img 
                    src={userDetails.user.avatar} 
                    alt={userDetails.user.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center">
                    <span className="text-brand-400 font-bold text-2xl">
                      {userDetails.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-white">{userDetails.user.name}</h3>
                  <p className="text-sm text-gray-400">{userDetails.user.email}</p>
                  <p className="text-xs text-brand-400 mt-1">
                    {new Date(selectedDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setUserDetails(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={20} className="text-green-400" />
                    <span className="text-sm text-gray-400">Leads</span>
                  </div>
                  <p className="text-3xl font-bold text-green-400">{userDetails.activities.leads.count}</p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare size={20} className="text-blue-400" />
                    <span className="text-sm text-gray-400">Meetings</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-400">{userDetails.activities.meetings.count}</p>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderOpen size={20} className="text-purple-400" />
                    <span className="text-sm text-gray-400">Projects</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-400">{userDetails.activities.projects.count}</p>
                </div>
              </div>

              {/* Detailed Lists */}
              <div className="space-y-6">
                {/* Leads */}
                {userDetails.activities.leads.count > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Target size={18} className="text-green-400" />
                      Leads Created ({userDetails.activities.leads.count})
                    </h4>
                    <div className="space-y-2">
                      {userDetails.activities.leads.items.map((lead) => (
                        <div 
                          key={lead.id}
                          className="bg-dark-900/50 border border-white/5 rounded-lg p-4 hover:border-brand-500/30 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-white">{lead.fullName}</p>
                              {lead.company && (
                                <p className="text-sm text-gray-400">{lead.company}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">{lead.phone}</p>
                            </div>
                            <div className="text-right">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                lead.temperature === 'HOT' ? 'bg-red-500/20 text-red-400' :
                                lead.temperature === 'WARM' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-blue-500/20 text-blue-400'
                              }`}>
                                {lead.temperature}
                              </span>
                              <p className="text-xs text-gray-500 mt-1">{lead.stage}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meetings */}
                {userDetails.activities.meetings.count > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <MessageSquare size={18} className="text-blue-400" />
                      Meetings Scheduled ({userDetails.activities.meetings.count})
                    </h4>
                    <div className="space-y-2">
                      {userDetails.activities.meetings.items.map((meeting) => (
                        <div 
                          key={meeting.id}
                          className="bg-dark-900/50 border border-white/5 rounded-lg p-4 hover:border-brand-500/30 transition-colors"
                        >
                          <p className="font-semibold text-white">{meeting.title}</p>
                          {meeting.description && (
                            <p className="text-sm text-gray-400 mt-1">{meeting.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>📅 {new Date(meeting.meetingDate).toLocaleDateString()}</span>
                            <span>🕐 {meeting.meetingTime}</span>
                            <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400">{meeting.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {userDetails.activities.projects.count > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <FolderOpen size={18} className="text-purple-400" />
                      Projects Added ({userDetails.activities.projects.count})
                    </h4>
                    <div className="space-y-2">
                      {userDetails.activities.projects.items.map((project) => (
                        <div 
                          key={project.id}
                          className="bg-dark-900/50 border border-white/5 rounded-lg p-4 hover:border-brand-500/30 transition-colors"
                        >
                          <p className="font-semibold text-white">{project.title}</p>
                          {project.description && (
                            <p className="text-sm text-gray-400 mt-1">{project.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <span className={`px-2 py-1 rounded ${
                              project.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                              project.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {project.priority}
                            </span>
                            <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-400">{project.status}</span>
                            {project.budget && (
                              <span className="text-gray-500">Budget: ₹{project.budget.toLocaleString('en-IN')}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                onClick={() => copyReport(userDetails.user.id)}
                className="btn-secondary flex items-center gap-2"
              >
                <Download size={16} />
                Copy Report
              </button>
              <button
                onClick={() => sendToWhatsApp(userDetails.user.id, userDetails.user.name)}
                className="btn-primary flex items-center gap-2"
              >
                <Send size={16} />
                Send to WhatsApp
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
