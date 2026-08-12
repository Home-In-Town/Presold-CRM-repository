import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import logoSrc from '../assets/logo.svg';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'B2B_SALES' });
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        const result = await register(form);
        if (result.pending) {
          toast.success(result.message || 'Registration request submitted. Please wait for admin approval.');
          setLoading(false);
          return;
        }
        toast.success('Account created successfully!');
      } else {
        await login(form.email, form.password);
        toast.success('Welcome back!');
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Authentication failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand-600/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent-600/10 rounded-full blur-[128px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/20 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-dark-950 mb-4 shadow-glow-lg"
          >
            <img src={logoSrc} alt="PreSold CRM logo" className="max-h-16 max-w-[120px] object-contain" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white">PreSold CRM</h1>
          <p className="text-sm text-gray-500 mt-1">Your sales acceleration platform</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white mb-2">
            {isRegister ? 'Create Account' : 'Sign In'}
          </h2>

          {isRegister && (
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Full Name" className="input-field pl-10" required
              />
            </div>
          )}

          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="Email address" className="input-field pl-10" required
            />
          </div>

          {isRegister && (
            <div className="relative">
              <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone (optional)" className="input-field pl-10"
              />
            </div>
          )}

          {isRegister && (
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block">Register as</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                className="input-field text-sm"
              >
                <option value="SALES_EXECUTIVE">Builder / Developer Sales Team</option>
                <option value="B2B_SALES">B2B Service Sales Team</option>
                <option value="DMA_WHITE_LABEL">DMA White-Label Sales Team</option>
                <option value="CONTENT_CREATION">Content Creation Team</option>
              </select>
            </div>
          )}

          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type={showPassword ? 'text' : 'password'} value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Password" className="input-field pl-10 pr-10" required minLength={4}
            />
            <button
              type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {!isRegister && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 rounded bg-dark-600 border-dark-400 accent-brand-500" />
                Remember me
              </label>
              <button type="button" className="text-xs text-brand-400 hover:text-brand-300">
                Forgot password?
              </button>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Please wait...</span>
              </div>
            ) : isRegister ? 'Create Account' : 'Sign In'}
          </button>

          <p className="text-center text-sm text-gray-500">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button type="button" onClick={() => setIsRegister(!isRegister)} className="text-brand-400 hover:text-brand-300 font-medium">
              {isRegister ? 'Sign In' : 'Register'}
            </button>
          </p>
        </form>


      </motion.div>
    </div>
  );
}
