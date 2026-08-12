import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Save, User, Lock, Palette, Upload, Check } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const defaultBranding = {
  brandLogoUrl: '',
  brandLogoPosition: 'bottom-right',
  brandLogoEnabled: true
};

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [branding, setBranding] = useState(defaultBranding);
  const [aiKeys, setAiKeys] = useState({ openAiKey: '', groqKey: '' });
  const [saving, setSaving] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    const loadBrandSettings = async () => {
      try {
        const res = await api.get('/settings');
        setBranding({
          brandLogoUrl: res.data.brandLogoUrl || res.data.companyLogoUrl || '',
          brandLogoPosition: res.data.brandLogoPosition || res.data.logoPosition || 'bottom-right',
          brandLogoEnabled: res.data.brandLogoEnabled !== undefined ? Boolean(res.data.brandLogoEnabled) : true
        });
        setAiKeys({
          openAiKey: res.data.OPENAI_API_KEY || '',
          groqKey: res.data.GROQ_API_KEY || ''
        });
      } catch {
        // ignore if no settings have been configured yet
      }
    };

    loadBrandSettings();
  }, []);

  const updateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', form);
      updateUser(res.data);
      toast.success('Profile updated');
    } catch { toast.error('Update failed'); }
    setSaving(false);
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await api.put('/auth/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      toast.success('Password changed');
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'general');
      formData.append('tags', JSON.stringify(['brand-logo']));

      const res = await api.post('/uploads/assets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setBranding(prev => ({ ...prev, brandLogoUrl: res.data.url }));
      toast.success('Logo uploaded');
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Logo upload failed';
      toast.error(`Logo upload failed: ${message}`);
    }
    setUploadingLogo(false);
    e.target.value = '';
  };

  const saveBranding = async () => {
    setBrandingSaving(true);
    try {
      await api.put('/settings', {
        brandLogoUrl: branding.brandLogoUrl,
        brandLogoPosition: branding.brandLogoPosition,
        brandLogoEnabled: branding.brandLogoEnabled
      });
      toast.success('Branding settings saved');
    } catch {
      toast.error('Failed to save branding');
    }
    setBrandingSaving(false);
  };

  const saveAiKeys = async () => {
    setAiSaving(true);
    try {
      await api.put('/settings', {
        OPENAI_API_KEY: aiKeys.openAiKey,
        GROQ_API_KEY: aiKeys.groqKey
      });
      toast.success('AI API keys saved');
    } catch {
      toast.error('Failed to save AI keys');
    }
    setAiSaving(false);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <SettingsIcon size={20} className="text-brand-400" /> Settings
      </h1>

      {/* Profile */}
      <motion.form onSubmit={updateProfile} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><User size={14} /> Profile</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Name</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field text-sm" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input-field text-sm" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-1">Email</label>
          <input type="email" value={user?.email || ''} disabled className="input-field text-sm opacity-50 cursor-not-allowed" />
        </div>
        <button type="submit" disabled={saving} className="btn-primary text-sm flex items-center gap-2">
          <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </motion.form>

      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Palette size={14} /> Branding</h3>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl border border-white/10 bg-dark-800 flex items-center justify-center overflow-hidden">
              {branding.brandLogoUrl ? (
                <img src={branding.brandLogoUrl} alt="Brand logo" className="w-full h-full object-contain p-2" />
              ) : (
                <span className="text-[10px] text-gray-500">Logo</span>
              )}
            </div>
            <label className="btn-secondary text-xs flex items-center gap-2 cursor-pointer">
              {uploadingLogo ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload size={12} />}
              Upload Logo
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Logo position</label>
              <select
                value={branding.brandLogoPosition}
                onChange={e => setBranding(prev => ({ ...prev, brandLogoPosition: e.target.value }))}
                className="input-field text-sm"
              >
                <option value="top-left">Top left</option>
                <option value="top-right">Top right</option>
                <option value="bottom-left">Bottom left</option>
                <option value="bottom-right">Bottom right</option>
                <option value="center">Center</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-[10px] text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={branding.brandLogoEnabled}
                  onChange={e => setBranding(prev => ({ ...prev, brandLogoEnabled: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded bg-dark-600 border-dark-400 accent-brand-500"
                />
                Show logo overlay
              </label>
            </div>
          </div>
        </div>

        <button type="button" onClick={saveBranding} disabled={brandingSaving} className="btn-primary text-sm flex items-center gap-2">
          <Check size={14} /> {brandingSaving ? 'Saving...' : 'Save Branding'}
        </button>
      </div>

      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Lock size={14} /> AI API Keys</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">OpenAI API Key</label>
            <input
              type="password"
              value={aiKeys.openAiKey}
              onChange={e => setAiKeys(prev => ({ ...prev, openAiKey: e.target.value }))}
              placeholder="sk-..."
              className="input-field text-sm"
            />
            <p className="text-[10px] text-gray-500 mt-1">Used for DALL-E image generation and OpenAI-compatible text generation.</p>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Groq API Key</label>
            <input
              type="password"
              value={aiKeys.groqKey}
              onChange={e => setAiKeys(prev => ({ ...prev, groqKey: e.target.value }))}
              placeholder="gsk-..."
              className="input-field text-sm"
            />
            <p className="text-[10px] text-gray-500 mt-1">Used for Groq-compatible text generation and image fallback if supported.</p>
          </div>
        </div>
        <button type="button" onClick={saveAiKeys} disabled={aiSaving} className="btn-primary text-sm flex items-center gap-2">
          <Save size={14} /> {aiSaving ? 'Saving...' : 'Save API Keys'}
        </button>
      </div>

      {/* Password */}
      <form onSubmit={changePassword} className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Lock size={14} /> Change Password</h3>
        <input type="password" value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} placeholder="Current password" className="input-field text-sm" required />
        <div className="grid grid-cols-2 gap-3">
          <input type="password" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} placeholder="New password" className="input-field text-sm" required minLength={4} />
          <input type="password" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} placeholder="Confirm password" className="input-field text-sm" required />
        </div>
        <button type="submit" className="btn-secondary text-sm">Change Password</button>
      </form>

      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><User size={14} /> Account</h3>
        <p className="text-sm text-gray-300">Signed in as <span className="font-medium text-white">{user?.name || user?.email}</span></p>
        <button type="button" onClick={logout} className="btn-secondary text-sm w-full">
          Log Out
        </button>
      </div>
    </div>
  );
}
