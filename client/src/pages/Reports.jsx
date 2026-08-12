import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Calendar } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export default function Reports() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ calls: 0, meetings: 0, siteVisits: 0, demos: 0, sales: 0, revenue: 0, problems: '', achievements: '' });

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    try {
      const res = await api.get('/reports/daily');
      setReports(res.data);
    } catch (err) {
      toast.error('Failed to load reports');
    }
  };

  const submitReport = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reports/daily', form);
      toast.success('Daily report submitted! +5 XP');
      setShowForm(false);
      setForm({ calls: 0, meetings: 0, siteVisits: 0, demos: 0, sales: 0, revenue: 0, problems: '', achievements: '' });
      loadReports();
    } catch {
      toast.error('Submit failed');
    }
  };

  const approveReport = async (reportId) => {
    try {
      await api.put(`/reports/daily/${reportId}/approve`);
      toast.success('Report approved');
      loadReports();
    } catch {
      toast.error('Approval failed');
    }
  };

  const totalReports = reports.length;
  const approvedReports = reports.filter(r => r.approved).length;
  const pendingReports = totalReports - approvedReports;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Daily Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Submit and review daily activity reports for your sales team.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm flex items-center gap-2">
          <FileText size={14} /> {showForm ? 'Hide Form' : 'New Report'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Reports', value: totalReports, color: 'from-brand-500 to-indigo-500' },
          { label: 'Approved', value: approvedReports, color: 'from-emerald-500 to-teal-500' },
          { label: 'Pending', value: pendingReports, color: 'from-amber-500 to-orange-500' }
        ].map(card => (
          <div key={card.label} className="glass-card p-4 border border-white/5">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-3">{card.label}</p>
            <div className={`text-3xl font-bold text-white bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}>{card.value}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <motion.form onSubmit={submitReport} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 space-y-5 border border-white/5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Today's Report</h2>
              <p className="text-xs text-gray-400">Add your activity for the day and submit for approval.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            {[{ key: 'calls', label: 'Calls' }, { key: 'meetings', label: 'Meetings' }, { key: 'siteVisits', label: 'Visits' }, { key: 'demos', label: 'Demos' }, { key: 'sales', label: 'Sales' }, { key: 'revenue', label: 'Revenue' }].map(f => (
              <label key={f.key} className="block text-[10px] text-gray-400">
                <span className="block mb-1 text-[10px] uppercase tracking-[0.2em] text-gray-500">{f.label}</span>
                <input
                  type="number"
                  min="0"
                  value={form[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: parseInt(e.target.value) || 0 })}
                  className="input-field text-sm text-center w-full"
                />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <textarea value={form.achievements} onChange={e => setForm({ ...form, achievements: e.target.value })} placeholder="Achievements today..." className="input-field text-sm h-28 resize-none" />
            <textarea value={form.problems} onChange={e => setForm({ ...form, problems: e.target.value })} placeholder="Problems/blockers..." className="input-field text-sm h-28 resize-none" />
          </div>
          <button type="submit" className="btn-primary w-full text-sm">Submit Report</button>
        </motion.form>
      )}

      <div className="space-y-4">
        {reports.map(r => (
          <div key={r.id} className="glass-card p-5 border border-white/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{r.user?.name || 'You'}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(r.date).toLocaleDateString()} · {r.calls} calls · {r.meetings} meetings · {r.demos} demos · {r.sales} sales</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${r.approved ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
                  {r.approved ? 'Approved' : 'Pending'}
                </span>
                {!r.approved && user?.role === 'ADMIN' && (
                  <button
                    onClick={() => approveReport(r.id)}
                    className="text-[11px] px-3 py-2 rounded-lg bg-green-500/10 text-green-300 hover:bg-green-500/20 transition-colors"
                  >
                    Approve
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 sm:grid-cols-4">
              {[
                { label: 'Calls', value: r.calls },
                { label: 'Meetings', value: r.meetings },
                { label: 'Demos', value: r.demos },
                { label: 'Sales', value: r.sales }
              ].map(metric => (
                <div key={metric.label} className="rounded-2xl bg-white/5 p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-1">{metric.label}</p>
                  <p className="text-lg font-semibold text-white">{metric.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 mt-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-1">Achievements</p>
                <p className="text-sm text-gray-300">{r.achievements || 'No achievements provided.'}</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-1">Problems</p>
                <p className="text-sm text-gray-300">{r.problems || 'No problems reported.'}</p>
              </div>
            </div>
          </div>
        ))}
        {reports.length === 0 && <p className="text-center text-sm text-gray-500 py-10">No reports yet</p>}
      </div>
    </div>
  );
}
