import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, GitBranch, BookOpen, FileText, Trophy, BarChart3,
  FolderOpen, Settings, Bot, CheckSquare, Menu, X, Bell, Search,
  LogOut, ChevronLeft, UserCircle, UsersRound, CheckCheck, Calendar
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import logoSrc from '../../assets/logo.svg';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/leads', label: 'Leads', icon: Users },
  { path: '/pipeline', label: 'Pipeline', icon: GitBranch },
  { path: '/playbook', label: 'Playbook', icon: BookOpen },
  { path: '/content', label: 'Content', icon: FileText },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  { path: '/90-day-plan', label: '90-Day Plan', icon: Calendar },
  { path: '/ai', label: 'AI Assistant', icon: Bot },
  { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/assets', label: 'Library', icon: FolderOpen },
  { path: '/team', label: 'Team', icon: UsersRound },
  { path: '/settings', label: 'Settings', icon: Settings }
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userXp, setUserXp] = useState(0);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const [notificationsRes, countRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count')
      ]);
      setNotifications(notificationsRes.data || []);
      setUnreadCount(countRes.data?.count || 0);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    if (user) {
      api.get('/leaderboard/me')
        .then(res => setUserXp(res.data?.xp || 0))
        .catch(() => setUserXp(0));
    }

    const handleXpUpdate = (event) => {
      const xpGain = Number(event.detail?.xpGain || 0);
      if (xpGain > 0) {
        setUserXp(prev => prev + xpGain);
      }
    };

    window.addEventListener('xp:update', handleXpUpdate);
    return () => window.removeEventListener('xp:update', handleXpUpdate);
  }, [user]);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      try {
        await api.put(`/notifications/${notification.id}/read`);
        setNotifications(prev => prev.map(item => item.id === notification.id ? { ...item, read: true } : item));
        setUnreadCount(prev => Math.max(prev - 1, 0));
      } catch (err) {
        console.error('Failed to mark notification as read', err);
      }
    }

    if (notification.link) {
      navigate(notification.link);
    }
    setNotificationsOpen(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(item => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  // All roles just use /playbook — the PlaybookRouter in App.jsx renders the correct one
  const visibleNavItems = navItems.filter(item => {
    // Qualifier — sees leads, pipeline, dashboard, assets, settings
    if (user?.role === 'QUALIFIER') {
      return ['/dashboard', '/leads', '/pipeline', '/assets', '/tasks', '/reports', '/90-day-plan', '/settings'].includes(item.path);
    }
    // DMA White Label team
    if (user?.role === 'DMA_WHITE_LABEL') {
      return ['/dashboard', '/leads', '/pipeline', '/playbook', '/tasks', '/assets', '/ai', '/reports', '/90-day-plan', '/settings'].includes(item.path);
    }
    // B2B Sales team
    if (user?.role === 'B2B_SALES') {
      return ['/dashboard', '/leads', '/pipeline', '/playbook', '/tasks', '/assets', '/ai', '/reports', '/90-day-plan', '/settings'].includes(item.path);
    }
    // Content creators
    if (user?.role === 'CONTENT_CREATION') {
      return ['/content', '/assets', '/ai', '/playbook', '/90-day-plan', '/settings', '/dashboard'].includes(item.path);
    }
    // Sales executives
    if (user?.role === 'SALES_EXECUTIVE') {
      return ['/dashboard', '/leads', '/pipeline', '/playbook', '/tasks', '/assets', '/ai', '/reports', '/90-day-plan', '/settings'].includes(item.path);
    }
    // Admin sees everything except Content (content is for CONTENT_CREATION only)
    return item.path !== '/content';
  });

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col fixed top-0 left-0 h-screen z-40 transition-all duration-300 
        ${sidebarOpen ? 'w-64' : 'w-20'} bg-dark-800 border-r border-white/5`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/5">
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
              <img src={logoSrc} alt="PreSold CRM logo" className="h-10 w-auto max-w-[120px] object-contain" />
              <span className="font-semibold text-white text-sm">PreSold CRM</span>
            </motion.div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500">
            <ChevronLeft size={16} className={`transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {visibleNavItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item-active' : ''} ${!sidebarOpen ? 'justify-center px-2' : ''}`
              }
            >
              <item.icon size={18} />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-white/5">
          <div className={`flex items-center gap-3 p-2 rounded-xl ${!sidebarOpen ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-brand-600/30 flex items-center justify-center flex-shrink-0">
              <UserCircle size={18} className="text-brand-400" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-gray-500 truncate">{user?.role?.replace('_', ' ')}</p>
              </div>
            )}
            {sidebarOpen && (
              <button onClick={logout} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-red-400 transition-colors">
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 left-0 h-full w-72 bg-dark-800 border-r border-white/5 p-4"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <img src={logoSrc} alt="PreSold CRM logo" className="w-10 h-10 rounded-xl" />
                  <span className="font-semibold text-white">PreSold CRM</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-white/5">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
              <nav className="space-y-1">
                {visibleNavItems.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 lg:px-6 bg-dark-900/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-white/5">
              <Menu size={20} className="text-gray-400" />
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-dark-700/50 border border-white/5 rounded-xl px-3 py-2 w-64">
              <Search size={14} className="text-gray-500" />
              <input type="text" placeholder="Search..." className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-full" />
            </div>
          </div>
          <div className="flex items-center gap-2 relative">
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-brand-500/20 bg-brand-600/10 px-2.5 py-1.5 mr-1">
              <Trophy size={14} className="text-brand-300" />
              <span className="text-xs font-semibold text-brand-200">{userXp} XP</span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-xl hover:bg-white/5 transition-colors"
                aria-label="Notifications"
              >
                <Bell size={18} className="text-gray-400" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-brand-500 text-[8px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 w-80 max-h-96 overflow-hidden rounded-2xl border border-white/10 bg-dark-800 shadow-2xl shadow-black/30 z-50"
                  >
                    <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                      <p className="text-sm font-semibold text-white">Notifications</p>
                      {notifications.some(n => !n.read) && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="flex items-center gap-1 text-[10px] font-medium text-brand-300 hover:text-brand-200"
                        >
                          <CheckCheck size={12} /> Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-gray-400">No notifications yet</div>
                      ) : (
                        notifications.map(notification => (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => handleNotificationClick(notification)}
                            className={`w-full border-b border-white/5 px-4 py-3 text-left transition-colors ${notification.read ? 'bg-transparent hover:bg-white/5' : 'bg-brand-600/5 hover:bg-brand-600/10'}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-white truncate">{notification.title}</p>
                                <p className="mt-1 text-[11px] leading-relaxed text-gray-300">{notification.message}</p>
                              </div>
                              {!notification.read && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-500 flex-shrink-0" />}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="hidden sm:flex items-center gap-2 pl-3 ml-2 border-l border-white/5">
              <div className="w-8 h-8 rounded-full bg-brand-600/30 flex items-center justify-center">
                <span className="text-xs font-bold text-brand-400">{user?.name?.[0]}</span>
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-medium text-white">{user?.name}</p>
                <p className="text-[10px] text-gray-500">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
