import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Shield, Ban, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export default function Team() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const { user } = useAuth();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [usersRes, teamsRes] = await Promise.all([
        api.get('/teams/users'),
        api.get('/teams')
      ]);
      setUsers(usersRes.data);
      setTeams(teamsRes.data);
    } catch {}
  };

  const toggleUser = async (userId, isActive) => {
    try {
      const endpoint = isActive ? 'suspend' : 'activate';
      await api.put(`/teams/${endpoint}/${userId}`);
      toast.success(isActive ? 'User suspended' : 'User activated');
      loadData();
    } catch {
      toast.error('Failed');
    }
  };

  const approveUser = async (userId) => {
    try {
      await api.put(`/teams/activate/${userId}`);
      toast.success('User approved');
      loadData();
    } catch {
      toast.error('Failed to approve user');
    }
  };

  const rejectUser = async (userId) => {
    try {
      await api.put(`/teams/reject/${userId}`);
      toast.success('User rejected');
      loadData();
    } catch {
      toast.error('Failed to reject user');
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Team</h1>
          <p className="text-xs text-gray-500">{users.length} members</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-4 py-3">Member</th>
              <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-4 py-3 hidden sm:table-cell">Role</th>
              <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Attendance</th>
              <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Team</th>
              <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-4 py-3">Status</th>
              {isAdmin && <th className="text-right text-[10px] font-semibold text-gray-500 uppercase px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="table-row">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-600/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-brand-400">{u.name[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm text-white">{u.name}</p>
                      <p className="text-[10px] text-gray-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="text-xs text-gray-400">{u.role.replace('_', ' ')}</span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {u.attendance ? (
                    <div className="text-[11px] text-gray-300">
                      <p className={`font-medium ${u.attendance.checkedOutAt ? 'text-gray-400' : 'text-green-400'}`}>{u.attendance.status}</p>
                      <p className="text-[10px] text-gray-500">{u.attendance.checkedOutAt ? `Out ${new Date(u.attendance.checkedOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : `In ${new Date(u.attendance.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}</p>
                    </div>
                  ) : (
                    <span className="text-[11px] text-gray-500">No check-in yet</span>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-xs text-gray-500">{u.team?.name || '—'}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-2 py-1 rounded-md ${u.pendingApproval ? 'bg-amber-500/20 text-amber-300' : u.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {u.pendingApproval ? 'Pending approval' : u.isActive ? 'Active' : 'Suspended'}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right space-x-2">
                    {u.pendingApproval ? (
                      <>
                        <button onClick={() => approveUser(u.id)} className="text-[10px] px-2.5 py-1 rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors">
                          Approve
                        </button>
                        <button onClick={() => rejectUser(u.id)} className="text-[10px] px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                          Reject
                        </button>
                      </>
                    ) : (
                      <button onClick={() => toggleUser(u.id, u.isActive)} className={`text-[10px] px-2.5 py-1 rounded-md ${u.isActive ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'} transition-colors`}>
                        {u.isActive ? 'Suspend' : 'Activate'}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
