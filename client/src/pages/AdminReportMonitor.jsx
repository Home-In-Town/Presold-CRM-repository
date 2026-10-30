import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Users, TrendingUp, FileText, Share2, Download,
  ChevronLeft, ChevronRight, Filter, Search, Phone, Building2,
  CheckCircle, Clock, Target, Eye
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export default function AdminReportMonitor() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
  const [loading, setLoading] = useState(true);
  const [showReportDetail, setShowReportDetail] = useState(null);

  useEffect(() => {
    loadUsers();
    loadReports();
  }, [selectedDate, selectedUser]);

  const loadUsers = async () => {
    try {
      const res = await api.get('/reports/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Load users error:', err);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedUser) params.userId = selectedUser;
      // Get reports for the entire selected month
      const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      params.startDate = startDate.toISOString();
      params.endDate = endDate.toISOString();
      
      console.log('Loading reports with params:', params);
      const res = await api.get('/reports/admin/all', { params });
      console.log('Reports loaded:', res.data);
      setReports(res.data || []);
      setLoading(false);
    } catch (err) {
      console.error('Load reports error:', err);
      console.error('Error response:', err.response?.data);
      toast.error(err.response?.data?.error || 'Failed to load reports');
      setReports([]);
      setLoading(false);
    }
  };

  const shareOnWhatsApp = async (report) => {
    try {
      const res = await api.get(`/reports/admin/download/${report.id}`);
      const message = res.data.text;
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
    } catch (err) {
      toast.error('Failed to format report');
    }
  };

  const downloadReport = async (report) => {
    try {
      const res = await api.get(`/reports/admin/download/${report.id}`);
      const message = res.data.text;
      
      // Create a text file download
      const blob = new Blob([message], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date(report.date).toLocaleDateString('en-IN').replace(/\//g, '-');
      link.setAttribute('download', `report_${report.user.name}_${dateStr}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Report downloaded!');
    } catch (err) {
      toast.error('Failed to download report');
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getReportForDate = (day) => {
    const dateStr = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      day
    ).toISOString().split('T')[0];
    
    return reports.filter(r => {
      const reportDate = new Date(r.date).toISOString().split('T')[0];
      return reportDate === dateStr;
    });
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(selectedDate);
  const monthName = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-dark-900 p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">📊 Report Monitoring</h1>
        <p className="text-gray-400">View and manage daily activity reports</p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* User Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Users size={16} className="inline mr-2" />
              Filter by User
            </label>
            <select
              value={selectedUser || ''}
              onChange={(e) => setSelectedUser(e.target.value || null)}
              className="w-full px-4 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            >
              <option value="">All Users</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* View Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              View Mode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-brand-500 text-white'
                    : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                }`}
              >
                <Calendar size={16} className="inline mr-2" />
                Calendar
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-brand-500 text-white'
                    : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                }`}
              >
                <FileText size={16} className="inline mr-2" />
                List
              </button>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="glass-card p-4">
            <div className="text-xs text-gray-400 mb-1">Total Reports Today</div>
            <div className="text-2xl font-bold text-white">
              {reports.filter(r => {
                const today = new Date().toISOString().split('T')[0];
                const reportDate = new Date(r.date).toISOString().split('T')[0];
                return reportDate === today;
              }).length}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="glass-card p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-bold text-white">{monthName}</h2>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-white transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-400 py-2">
                {day}
              </div>
            ))}

            {/* Empty cells for starting day */}
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Calendar Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayReports = getReportForDate(day);
              const hasReports = dayReports.length > 0;
              const isToday = new Date().getDate() === day &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              return (
                <motion.button
                  key={day}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const newDate = new Date(year, month, day);
                    setSelectedDate(newDate);
                    if (dayReports.length > 0) {
                      setShowReportDetail(dayReports);
                    }
                  }}
                  className={`aspect-square rounded-lg p-2 relative transition-all ${
                    isToday
                      ? 'bg-brand-500/20 border-2 border-brand-500'
                      : hasReports
                      ? 'bg-green-500/10 border border-green-500/30 hover:bg-green-500/20'
                      : 'bg-dark-700 hover:bg-dark-600 border border-dark-600'
                  }`}
                >
                  <div className={`text-sm font-semibold ${
                    isToday ? 'text-brand-400' : hasReports ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {day}
                  </div>
                  {hasReports && (
                    <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white">{dayReports.length}</span>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 justify-center text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-brand-500/20 border-2 border-brand-500" />
              <span className="text-gray-400">Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500/10 border border-green-500/30" />
              <span className="text-gray-400">Has Reports</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-dark-700 border border-dark-600" />
              <span className="text-gray-400">No Reports</span>
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent mb-4"></div>
              <p>Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <FileText size={32} className="text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Reports Found</h3>
              <p className="text-sm text-gray-400 mb-4">
                {selectedUser 
                  ? 'This user hasn\'t submitted any reports for the selected period.' 
                  : 'No daily reports have been submitted yet. Reports will appear here once team members submit them.'}
              </p>
              <p className="text-xs text-gray-500">
                💡 Tip: Team members can submit reports from the Reports page in their dashboard
              </p>
            </div>
          ) : (
            reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onShare={() => shareOnWhatsApp(report)}
                onDownload={() => downloadReport(report)}
                onView={() => setShowReportDetail([report])}
              />
            ))
          )}
        </div>
      )}

      {/* Report Detail Modal */}
      <AnimatePresence>
        {showReportDetail && (
          <ReportDetailModal
            reports={showReportDetail}
            onClose={() => setShowReportDetail(null)}
            onShare={shareOnWhatsApp}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ReportCard({ report, onShare, onDownload, onView }) {
  const reportDate = new Date(report.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 hover:border-brand-500/50 transition-all cursor-pointer"
      onClick={onView}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
            <span className="text-lg font-bold text-white">
              {report.user?.name?.charAt(0) || '?'}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-white">{report.user?.name}</h3>
            <p className="text-sm text-gray-400">{reportDate}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
            title="Share on WhatsApp"
          >
            <Share2 size={18} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
            title="Download Report"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-lg bg-dark-700/50">
          <div className="text-xs text-gray-400 mb-1">Calls</div>
          <div className="text-lg font-bold text-white">{report.calls || 0}</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-dark-700/50">
          <div className="text-xs text-gray-400 mb-1">Meetings</div>
          <div className="text-lg font-bold text-white">{report.meetings || 0}</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-dark-700/50">
          <div className="text-xs text-gray-400 mb-1">Leads</div>
          <div className="text-lg font-bold text-white">{report.siteVisits || 0}</div>
        </div>
      </div>
    </motion.div>
  );
}

function ReportDetailModal({ reports, onClose, onShare }) {
  if (reports.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-dark-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-dark-700"
      >
        <div className="sticky top-0 bg-dark-800 border-b border-dark-700 p-6 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              📊 Daily Reports ({reports.length})
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg bg-dark-700 hover:bg-dark-600 flex items-center justify-center"
            >
              <span className="text-gray-400">✕</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {reports.map((report) => (
            <div key={report.id} className="glass-card p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
                    <span className="font-bold text-white">
                      {report.user?.name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{report.user?.name}</h3>
                    <p className="text-xs text-gray-400">
                      {new Date(report.date).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onShare(report)}
                  className="px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm font-medium flex items-center gap-2"
                >
                  <Share2 size={16} />
                  Share
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-dark-700/50 text-center">
                  <div className="text-xs text-gray-400 mb-1">📞 Calls</div>
                  <div className="text-xl font-bold text-white">{report.calls || 0}</div>
                </div>
                <div className="p-3 rounded-lg bg-dark-700/50 text-center">
                  <div className="text-xs text-gray-400 mb-1">🤝 Meetings</div>
                  <div className="text-xl font-bold text-white">{report.meetings || 0}</div>
                </div>
                <div className="p-3 rounded-lg bg-dark-700/50 text-center">
                  <div className="text-xs text-gray-400 mb-1">👥 Leads</div>
                  <div className="text-xl font-bold text-white">{report.siteVisits || 0}</div>
                </div>
                <div className="p-3 rounded-lg bg-dark-700/50 text-center">
                  <div className="text-xs text-gray-400 mb-1">💼 Demos</div>
                  <div className="text-xl font-bold text-white">{report.demos || 0}</div>
                </div>
                <div className="p-3 rounded-lg bg-dark-700/50 text-center">
                  <div className="text-xs text-gray-400 mb-1">💰 Sales</div>
                  <div className="text-xl font-bold text-white">{report.sales || 0}</div>
                </div>
                <div className="p-3 rounded-lg bg-dark-700/50 text-center">
                  <div className="text-xs text-gray-400 mb-1">📈 Revenue</div>
                  <div className="text-xl font-bold text-white">₹{report.revenue || 0}</div>
                </div>
              </div>

              {report.achievements && (
                <div className="mb-3">
                  <div className="text-sm font-medium text-green-400 mb-2">✅ Achievements</div>
                  <p className="text-sm text-gray-300 bg-dark-700/30 p-3 rounded-lg">
                    {report.achievements}
                  </p>
                </div>
              )}

              {report.problems && (
                <div>
                  <div className="text-sm font-medium text-red-400 mb-2">⚠️ Problems</div>
                  <p className="text-sm text-gray-300 bg-dark-700/30 p-3 rounded-lg">
                    {report.problems}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
