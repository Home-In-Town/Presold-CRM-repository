import { useState, useEffect } from 'react';
import { Calendar, Download, Users, Clock, TrendingUp, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function AttendanceReport() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState({
    totalDays: 0,
    avgHours: 0,
    totalUsers: 0,
    onTimePercentage: 0
  });

  useEffect(() => {
    loadAttendanceReport();
  }, [selectedMonth, selectedYear]);

  const loadAttendanceReport = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/admin/monthly-report', {
        params: {
          month: selectedMonth,
          year: selectedYear
        }
      });
      setRecords(res.data.records || []);
      calculateStats(res.data.records || []);
    } catch (err) {
      console.error('Failed to load attendance report:', err);
      toast.error(err.response?.data?.error || 'Failed to load attendance report');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    if (data.length === 0) {
      setStats({ totalDays: 0, avgHours: 0, totalUsers: 0, onTimePercentage: 0 });
      return;
    }

    const uniqueUsers = new Set(data.map(r => r.userId)).size;
    const totalDays = data.length;
    
    // Calculate average work hours
    const totalHours = data.reduce((sum, record) => {
      if (record.checkOutTime) {
        const checkIn = new Date(record.checkInTime);
        const checkOut = new Date(record.checkOutTime);
        const hours = (checkOut - checkIn) / (1000 * 60 * 60);
        return sum + hours;
      }
      return sum;
    }, 0);
    const avgHours = totalDays > 0 ? (totalHours / totalDays).toFixed(1) : 0;

    // Calculate on-time percentage (before 9:30 AM)
    const onTimeCount = data.filter(record => {
      const checkInTime = new Date(record.checkInTime);
      const hours = checkInTime.getHours();
      const minutes = checkInTime.getMinutes();
      return hours < 9 || (hours === 9 && minutes <= 30);
    }).length;
    const onTimePercentage = totalDays > 0 ? Math.round((onTimeCount / totalDays) * 100) : 0;

    setStats({
      totalDays,
      avgHours,
      totalUsers: uniqueUsers,
      onTimePercentage
    });
  };

  const calculateWorkHours = (checkInTime, checkOutTime) => {
    if (!checkOutTime) return 'In Progress';
    const checkIn = new Date(checkInTime);
    const checkOut = new Date(checkOutTime);
    const diffMs = checkOut - checkIn;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const exportToCSV = () => {
    if (records.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Date', 'User', 'Email', 'Check In', 'Check Out', 'Work Hours', 'Status', 'Check In Location', 'Check Out Location'];
    const rows = records.map(record => [
      new Date(record.checkInTime).toLocaleDateString(),
      record.userName,
      record.userEmail,
      new Date(record.checkInTime).toLocaleTimeString(),
      record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : 'N/A',
      calculateWorkHours(record.checkInTime, record.checkOutTime),
      record.status,
      `${record.checkIn.lat}, ${record.checkIn.lng}`,
      record.checkOut ? `${record.checkOut.lat}, ${record.checkOut.lng}` : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${selectedYear}-${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Report exported successfully');
  };

  const previousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getStatusBadge = (status) => {
    if (status === 'CHECKED_IN') {
      return <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded-full">Active</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-gray-500/20 text-gray-400 rounded-full">Completed</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
          <p className="mt-4 text-sm text-gray-400">Loading attendance report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="text-brand-400" />
            Attendance Report
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Monthly attendance tracking and statistics
          </p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={records.length === 0}
          className="btn-primary flex items-center gap-2"
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Month Selector */}
      <div className="bg-dark-800 rounded-xl p-4 border border-white/5">
        <div className="flex items-center justify-between">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white">
              {months[selectedMonth - 1]} {selectedYear}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {records.length} attendance records
            </p>
          </div>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-dark-800 rounded-xl p-4 border border-white/5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Calendar className="text-blue-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalDays}</p>
              <p className="text-xs text-gray-400">Total Days</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-dark-800 rounded-xl p-4 border border-white/5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Users className="text-purple-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
              <p className="text-xs text-gray-400">Team Members</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-dark-800 rounded-xl p-4 border border-white/5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Clock className="text-green-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.avgHours}h</p>
              <p className="text-xs text-gray-400">Avg Work Hours</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-dark-800 rounded-xl p-4 border border-white/5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <TrendingUp className="text-orange-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.onTimePercentage}%</p>
              <p className="text-xs text-gray-400">On Time (&lt;9:30 AM)</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Data Table */}
      <div className="bg-dark-800 rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-900 border-b border-white/5">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Check In
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Check Out
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Work Hours
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {records.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center">
                    <Calendar className="mx-auto text-gray-600 mb-2" size={32} />
                    <p className="text-sm text-gray-400">No attendance records for this month</p>
                  </td>
                </tr>
              ) : (
                records.map((record, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-white">
                      {new Date(record.checkInTime).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-white">{record.userName}</p>
                        <p className="text-xs text-gray-400">{record.userEmail}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {new Date(record.checkInTime).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {record.checkOutTime 
                        ? new Date(record.checkOutTime).toLocaleTimeString()
                        : <span className="text-yellow-400">In Progress</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {calculateWorkHours(record.checkInTime, record.checkOutTime)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <a
                          href={`https://www.google.com/maps?q=${record.checkIn.lat},${record.checkIn.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-400 hover:text-brand-300 transition-colors"
                          title="View Check-in Location"
                        >
                          <MapPin size={16} />
                        </a>
                        {record.checkOut && (
                          <a
                            href={`https://www.google.com/maps?q=${record.checkOut.lat},${record.checkOut.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-400 hover:text-red-300 transition-colors"
                            title="View Check-out Location"
                          >
                            <MapPin size={16} />
                          </a>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
