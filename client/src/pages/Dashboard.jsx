import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users, TrendingUp, Target, Zap, Calendar, Phone, ArrowUpRight,
  ArrowDownRight, Plus, Clock, CheckCircle2, Activity, Trophy
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [salesActivity, setSalesActivity] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [xp, setXp] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { loadStats(); loadXp(); if (user?.role !== 'SALES_EXECUTIVE') loadSalesActivity(); if (user) loadAttendance(); }, [user]);

  const loadXp = async () => {
    try {
      const res = await api.get('/leaderboard/me');
      setXp(res.data?.xp || 0);
    } catch {
      setXp(0);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      toast.error('Failed to load dashboard');
    }
    setLoading(false);
  };

  const loadAttendance = async () => {
    if (user?.role !== 'SALES_EXECUTIVE') return;
    try {
      const res = await api.get('/teams/attendance/me');
      setAttendance(res.data?.attendance || null);
    } catch {
      setAttendance(null);
    }
  };

  const toggleAttendance = async () => {
    if (user?.role !== 'SALES_EXECUTIVE') return;
    setAttendanceLoading(true);
    try {
      const res = await api.post('/teams/attendance/toggle');
      // Reload from the dedicated endpoint so state is always in sync
      const me = await api.get('/teams/attendance/me');
      setAttendance(me.data?.attendance || null);
      toast.success(res.data?.status === 'checked_in' ? 'Checked in successfully' : 'Checked out successfully');
    } catch {
      toast.error('Unable to update attendance');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const loadSalesActivity = async () => {
    try {
      const res = await api.get('/teams/activity');
      setSalesActivity(res.data || []);
    } catch (err) {
      console.error('Failed to load sales activity', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-4 bg-dark-500 rounded w-20 mb-3" />
              <div className="h-8 bg-dark-500 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: "Today's Leads", value: stats.todayLeads, icon: Users, color: 'from-brand-500 to-brand-600', change: '+12%', link: '/leads?filter=today&t=' + Date.now() },
    { label: 'Weekly Leads', value: stats.weeklyLeads, icon: TrendingUp, color: 'from-green-500 to-emerald-600', change: '+8%', link: '/leads?filter=week&t=' + Date.now() },
    { label: 'Total Pipeline', value: stats.total, icon: Target, color: 'from-amber-500 to-orange-600', change: null, link: '/pipeline' },
    { label: 'Deals Won', value: stats.wonDeals, icon: Zap, color: 'from-purple-500 to-violet-600', change: '+23%', link: '/leads?filter=won&t=' + Date.now() },
    { label: 'My XP', value: `${xp} XP`, icon: Trophy, color: 'from-cyan-500 to-sky-600', change: null, link: null },
  ];

  const funnelData = [
    { name: 'Response', value: stats.funnelRates.responseRate, target: 40 },
    { name: 'Demo', value: stats.funnelRates.demoRate, target: 25 },
    { name: 'Show', value: stats.funnelRates.showRate, target: 70 },
    { name: 'Close', value: stats.funnelRates.closeRate, target: 30 },
  ];

  const stageData = Object.entries(stats.stages || {}).map(([key, val]) => ({
    name: key.replace('_', ' ').slice(0, 8), value: val
  }));

  // Role → team display mapping
  const teamLabels = {
    SALES_EXECUTIVE: { label: 'Builder / Developer Sales Team', color: 'bg-brand-500/15 text-brand-400 border-brand-500/30' },
    B2B_SALES: { label: 'B2B Sales Team', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
    DMA_WHITE_LABEL: { label: 'DMA White Label Sales Team', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
    CONTENT_CREATION: { label: 'Content Creation Team', color: 'bg-pink-500/15 text-pink-400 border-pink-500/30' },
    QUALIFIER: { label: 'Lead Qualifier', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    ADMIN: { label: 'Admin', color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' }
  };
  const myTeam = teamLabels[user?.role] || { label: user?.role?.replace('_', ' '), color: 'bg-gray-500/15 text-gray-400 border-gray-500/30' };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div {...fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-sm text-gray-500">Here's what's happening with your pipeline today.</p>
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${myTeam.color}`}>
              {myTeam.label}
            </span>
          </div>
        </div>
        <button onClick={() => navigate('/leads')} className="btn-primary flex items-center gap-2 hidden sm:flex">
          <Plus size={16} /> Add Lead
        </button>
      </motion.div>

      {user?.role === 'SALES_EXECUTIVE' && (
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="glass-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Attendance</h3>
              <p className="text-xs text-gray-500 mt-1">
                {attendance?.checkedOutAt ? 'You are currently checked out.' : attendance ? 'You are currently checked in.' : 'No attendance recorded today.'}
              </p>
            </div>
            <button onClick={toggleAttendance} disabled={attendanceLoading} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${attendance?.checkedOutAt || !attendance ? 'bg-brand-500 text-white hover:bg-brand-400' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}>
              {attendanceLoading ? 'Please wait...' : attendance?.checkedOutAt || !attendance ? 'Check In' : 'Check Out'}
            </button>
          </div>
          {attendance && (
            <div className="mt-3 text-[11px] text-gray-400">
              <p>Checked in: {new Date(attendance.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              {attendance.checkedOutAt && <p>Checked out: {new Date(attendance.checkedOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
            </div>
          )}
        </motion.div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className={`stat-card group ${card.link ? 'cursor-pointer hover:ring-1 hover:ring-brand-500/30' : ''}`}
            onClick={() => card.link && navigate(card.link)}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-5 rounded-full -translate-y-6 translate-x-6 group-hover:opacity-10 transition-opacity" style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-from), var(--tw-gradient-to))` }} />
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-xl bg-gradient-to-br ${card.color} bg-opacity-10`}>
                <card.icon size={18} className="text-white" />
              </div>
              {card.change && (
                <span className="text-xs font-medium text-green-400 flex items-center gap-0.5">
                  <ArrowUpRight size={12} /> {card.change}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel Performance */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Funnel Performance</h3>
          <div className="space-y-3">
            {funnelData.map((item, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-400">{item.name} Rate</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${item.value >= item.target ? 'text-green-400' : 'text-amber-400'}`}>
                      {item.value}%
                    </span>
                    <span className="text-[10px] text-gray-600">/ {item.target}%</span>
                  </div>
                </div>
                <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(item.value, 100)}%` }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                    className={`h-full rounded-full ${item.value >= item.target ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-amber-500 to-orange-400'}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Pipeline Chart */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Pipeline Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stageData}>
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="value" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.6} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Activities */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={14} className="text-brand-400" /> Recent Activities
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {stats.recentActivities?.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-8">No activities yet. Start adding leads!</p>
            )}
            {stats.recentActivities?.map((act, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="w-7 h-7 rounded-lg bg-brand-600/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 size={12} className="text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300 truncate">{act.title}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{act.lead?.fullName} • {act.user?.name}</p>
                </div>
                <span className="text-[10px] text-gray-600 flex-shrink-0">
                  {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {user?.role !== 'SALES_EXECUTIVE' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Users size={14} className="text-purple-400" /> Sales Activity
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {salesActivity.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-8">No salesperson activity yet.</p>
              )}
              {salesActivity.map(rep => (
                <div key={rep.id} className="rounded-xl border border-white/5 bg-dark-600/30 p-2.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-brand-600/20 flex items-center justify-center text-[10px] font-bold text-brand-300">
                        {rep.name?.[0] || 'S'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-white truncate">{rep.name}</p>
                        <p className="text-[9px] text-gray-500">{rep.team}</p>
                      </div>
                    </div>
                    <span className="text-[9px] text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-full px-1.5 py-0.5">
                      {rep.activityCount} actions
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {rep.recentActivities.length === 0 ? (
                      <p className="text-[10px] text-gray-500">No recent activity</p>
                    ) : (
                      rep.recentActivities.slice(0, 2).map(activity => (
                        <div key={activity.id} className="flex items-start justify-between gap-2 text-[10px] text-gray-300">
                          <div className="min-w-0">
                            <p className="truncate">{activity.title}</p>
                            <p className="text-[9px] text-gray-500">{activity.leadName}</p>
                          </div>
                          <span className="text-[9px] text-gray-500 whitespace-nowrap">
                            {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Upcoming Follow-ups */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Clock size={14} className="text-amber-400" /> Upcoming Follow-ups
          </h3>
          <div className="space-y-2.5">
            {stats.upcomingFollowups?.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-8">No upcoming follow-ups</p>
            )}
            {stats.upcomingFollowups?.map((lead, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-dark-600/30 hover:bg-dark-600/50 cursor-pointer transition-colors" onClick={() => navigate(`/leads/${lead.id}`)}>
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Phone size={12} className="text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{lead.fullName}</p>
                  <p className="text-[10px] text-gray-500">
                    {lead.nextFollowUp ? new Date(lead.nextFollowUp).toLocaleDateString() : 'Today'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Temperature Overview */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <span className="text-2xl">🔥</span>
          <p className="text-2xl font-bold text-red-400 mt-2">{stats.temperatures?.HOT || 0}</p>
          <p className="text-[10px] text-gray-500">Hot Leads</p>
        </div>
        <div className="glass-card p-4 text-center">
          <span className="text-2xl">☀️</span>
          <p className="text-2xl font-bold text-amber-400 mt-2">{stats.temperatures?.WARM || 0}</p>
          <p className="text-[10px] text-gray-500">Warm Leads</p>
        </div>
        <div className="glass-card p-4 text-center">
          <span className="text-2xl">❄️</span>
          <p className="text-2xl font-bold text-blue-400 mt-2">{stats.temperatures?.COLD || 0}</p>
          <p className="text-[10px] text-gray-500">Cold Leads</p>
        </div>
      </motion.div>
    </div>
  );
}
