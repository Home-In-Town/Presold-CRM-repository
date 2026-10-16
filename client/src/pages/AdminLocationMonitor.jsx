import { useState, useEffect } from 'react';
import { MapPin, Users, Navigation, Clock, RefreshCw, User } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';
import MapWithRoute from '../components/MapWithRoute';

export default function AdminLocationMonitor() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    loadUsers();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadUsers();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadUserLocationHistory(selectedUser.id);
    }
  }, [selectedUser]);

  const loadUsers = async () => {
    try {
      if (!loading) setRefreshing(true);
      const res = await api.get('/location/users');
      setUsers(res.data || []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to load users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUserLocationHistory = async (userId) => {
    try {
      const res = await api.get(`/location/history/${userId}?limit=50`);
      setLocationHistory(res.data || []);
    } catch (err) {
      console.error('Failed to load location history:', err);
      toast.error('Failed to load location history');
      setLocationHistory([]);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getActivityStatus = (lastLocation) => {
    if (!lastLocation) return { label: 'Inactive', color: 'bg-gray-500', textColor: 'text-gray-400' };
    
    const lastUpdate = new Date(lastLocation);
    const now = new Date();
    const diffMins = (now - lastUpdate) / 60000;
    
    if (diffMins < 5) return { label: 'Active', color: 'bg-green-500', textColor: 'text-green-400' };
    if (diffMins < 30) return { label: 'Recent', color: 'bg-yellow-500', textColor: 'text-yellow-400' };
    return { label: 'Inactive', color: 'bg-gray-500', textColor: 'text-gray-400' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
          <p className="mt-4 text-sm text-gray-400">Loading location data...</p>
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
            <Navigation className="text-brand-400" />
            Live Location Monitor
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Track team member locations in real-time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-500">Last updated</p>
            <p className="text-sm font-medium text-gray-300">
              {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={loadUsers}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-dark-800 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Users className="text-green-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {users.filter(u => getActivityStatus(u.lastLocationUpdate).label === 'Active').length}
              </p>
              <p className="text-xs text-gray-400">Active Now</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Clock className="text-yellow-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {users.filter(u => getActivityStatus(u.lastLocationUpdate).label === 'Recent').length}
              </p>
              <p className="text-xs text-gray-400">Recent Activity</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <MapPin className="text-blue-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{users.length}</p>
              <p className="text-xs text-gray-400">Total Users</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-lg font-semibold text-white mb-3">Team Members</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {users.length === 0 ? (
              <div className="bg-dark-800 rounded-xl p-6 text-center border border-white/5">
                <Users className="mx-auto text-gray-600 mb-2" size={32} />
                <p className="text-sm text-gray-400">No users found</p>
              </div>
            ) : (
              users.map((user) => {
                const status = getActivityStatus(user.lastLocationUpdate);
                const isSelected = selectedUser?.id === user.id;
                
                return (
                  <motion.button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full bg-dark-800 rounded-xl p-4 border transition-all text-left ${
                      isSelected 
                        ? 'border-brand-500 ring-2 ring-brand-500/20' 
                        : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-brand-600/30 flex items-center justify-center">
                          <User size={20} className="text-brand-400" />
                        </div>
                        <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${status.color} border-2 border-dark-800`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.role?.replace('_', ' ')}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-medium ${status.textColor}`}>
                          {status.label}
                        </span>
                        <p className="text-[10px] text-gray-500">
                          {formatTime(user.lastLocationUpdate)}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </div>

        {/* Map View */}
        <div className="lg:col-span-2">
          <div className="bg-dark-800 rounded-xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <h2 className="text-lg font-semibold text-white">
                {selectedUser ? `${selectedUser.name}'s Location` : 'Select a user to view location'}
              </h2>
              {selectedUser && (
                <p className="text-sm text-gray-400 mt-1">
                  Last updated: {formatTime(selectedUser.lastLocationUpdate)}
                </p>
              )}
            </div>
            <div className="h-[500px]">
              {selectedUser && locationHistory.length > 0 ? (
                <MapWithRoute locations={locationHistory} />
              ) : (
                <div className="h-full flex items-center justify-center bg-dark-900">
                  <div className="text-center">
                    <MapPin className="mx-auto text-gray-600 mb-3" size={48} />
                    <p className="text-gray-400">
                      {selectedUser 
                        ? 'No location data available for this user' 
                        : 'Select a team member to view their location'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Location History */}
          {selectedUser && locationHistory.length > 0 && (
            <div className="mt-6 bg-dark-800 rounded-xl border border-white/5 p-4">
              <h3 className="text-md font-semibold text-white mb-3">Location History</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {locationHistory.slice(0, 10).map((location, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-brand-400" />
                      <span className="text-gray-300">
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(location.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
