import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Flame, Star, TrendingUp } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const LEVELS = [
  { threshold: 0, title: 'Rookie', emoji: '🌱' },
  { threshold: 50, title: 'Starter', emoji: '⚡' },
  { threshold: 150, title: 'Hustler', emoji: '🔥' },
  { threshold: 350, title: 'Closer', emoji: '💎' },
  { threshold: 700, title: 'Crusher', emoji: '🚀' },
  { threshold: 1200, title: 'Machine', emoji: '⚙️' },
  { threshold: 2000, title: 'Legend', emoji: '👑' },
  { threshold: 3500, title: 'Godmode', emoji: '🏆' }
];

function getLevel(xp) {
  let level = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].threshold) { level = LEVELS[i]; break; }
  }
  return level;
}

export default function Leaderboard() {
  const [data, setData] = useState([]);
  const [period, setPeriod] = useState('all');
  const [myRank, setMyRank] = useState(null);
  const { user } = useAuth();

  useEffect(() => { loadData(); }, [period]);

  const loadData = async () => {
    try {
      const [lbRes, meRes] = await Promise.all([
        api.get('/leaderboard', { params: { period } }),
        api.get('/leaderboard/me')
      ]);
      setData(lbRes.data);
      setMyRank(meRes.data);
    } catch {}
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-xl font-bold text-white">Leaderboard</h1>
        <p className="text-xs text-gray-500 mt-1">Compete with your team, climb the ranks</p>
      </div>

      {/* My Stats */}
      {myRank && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-600/20 flex items-center justify-center">
                <span className="text-2xl">{getLevel(myRank.xp).emoji}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Your Rank: #{myRank.rank || '—'}</p>
                <p className="text-xs text-gray-500">{getLevel(myRank.xp).title} • {myRank.xp} XP</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center"><p className="text-lg font-bold text-amber-400">{myRank.streak}</p><p className="text-[10px] text-gray-500">Streak</p></div>
              <div className="text-center"><p className="text-lg font-bold text-brand-400">{myRank.level}</p><p className="text-[10px] text-gray-500">Level</p></div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Period Tabs */}
      <div className="flex gap-2 justify-center">
        {['all', 'monthly', 'quarterly'].map(p => (
          <button key={p} onClick={() => setPeriod(p)} className={`chip ${period === p ? 'chip-active' : 'chip-inactive'}`}>
            {p === 'all' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Leaderboard List */}
      <div className="glass-card overflow-hidden divide-y divide-white/5">
        {data.map((entry, i) => {
          const level = getLevel(entry.xp);
          const isMe = entry.userId === user?.id;
          return (
            <motion.div key={entry.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-4 px-5 py-3.5 ${isMe ? 'bg-brand-600/5' : ''}`}>
              <span className="text-sm font-bold text-gray-600 w-6 text-center">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </span>
              <div className="w-9 h-9 rounded-full bg-dark-600 flex items-center justify-center">
                <span className="text-sm">{level.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {entry.user?.name}{isMe && <span className="text-brand-400 ml-1">(You)</span>}
                </p>
                <p className="text-[10px] text-gray-500">{level.title}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-brand-400">{period === 'monthly' ? entry.monthlyXp : period === 'quarterly' ? entry.quarterlyXp : entry.xp} XP</p>
                {entry.streak > 0 && <p className="text-[10px] text-amber-500">🔥 {entry.streak}d</p>}
              </div>
            </motion.div>
          );
        })}
        {data.length === 0 && <p className="text-center text-sm text-gray-500 py-10">No data yet</p>}
      </div>
    </div>
  );
}
