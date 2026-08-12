import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, GitBranch, BookOpen, Zap, Shield, BarChart3,
  MessageCircle, Brain, CheckCircle2, ArrowRight, Star,
  Phone, Globe, Rocket, Target, TrendingUp, Award
} from 'lucide-react';
import logoSrc from '../assets/logo.svg';

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    { icon: Users, title: 'Lead Management', desc: 'Capture, track, and manage all your leads in one place. Never lose a potential customer again.', color: 'brand' },
    { icon: GitBranch, title: 'Visual Pipeline', desc: 'Drag-and-drop pipeline with 11 stages. See exactly where every deal stands at a glance.', color: 'cyan' },
    { icon: BookOpen, title: 'Sales Playbook', desc: '20-chapter training playbook for every team. Built-in scripts, examples, and guided selling.', color: 'purple' },
    { icon: MessageCircle, title: 'WhatsApp Integration', desc: 'Send messages directly from the CRM with pre-filled scripts for every journey step.', color: 'green' },
    { icon: Brain, title: 'AI Assistant', desc: 'Generate follow-up messages, proposals, and sales scripts powered by AI.', color: 'pink' },
    { icon: BarChart3, title: 'Reports & Analytics', desc: 'Daily reports, funnel performance, and team leaderboard to track growth.', color: 'amber' },
    { icon: Shield, title: 'Role-Based Access', desc: 'Each team sees only their data. Admin controls everything. Complete data isolation.', color: 'red' },
    { icon: Target, title: 'Lead Journey', desc: '20-step guided journey for every lead with scripts, examples, and media at each stage.', color: 'orange' },
    { icon: Award, title: 'Gamification & XP', desc: 'Earn XP for completing tasks, reading playbooks, and closing deals. Leaderboard competition.', color: 'yellow' },
  ];

  const teams = [
    { name: 'Builder / Developer Sales', desc: 'Sell directly to real estate builders and developers', color: 'from-brand-500 to-purple-600' },
    { name: 'B2B Service Sales', desc: 'Sell CRM solutions to businesses and agencies', color: 'from-cyan-500 to-blue-600' },
    { name: 'DMA White Label', desc: 'Recruit agencies for white-label partnerships', color: 'from-orange-500 to-amber-600' },
    { name: 'Content Creation', desc: 'Create marketing content that builds trust', color: 'from-pink-500 to-rose-600' },
  ];

  const stats = [
    { value: '20+', label: 'Playbook Chapters per Team' },
    { value: '11', label: 'Pipeline Stages' },
    { value: '20', label: 'Guided Journey Steps' },
    { value: '4', label: 'Specialized Teams' },
  ];

  return (
    <div className="min-h-screen bg-dark-900 text-white overflow-hidden">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="PreSold CRM" className="h-9 w-auto" />
            <span className="font-bold text-lg text-white">PreSold CRM</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2">
              Sign In
            </button>
            <button onClick={() => navigate('/login')} className="btn-primary text-sm px-5 py-2">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 -left-40 w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-20 -right-40 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-600/5 rounded-full blur-[200px]" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium mb-6">
              <Rocket size={12} /> Built for Real Estate Sales Teams
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              The CRM That
              <span className="bg-gradient-to-r from-brand-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent"> Pre-Sells </span>
              Your Customers
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Complete sales acceleration platform with guided playbooks, AI-powered scripts, visual pipelines, and team-specific training. Built for builders, agencies, and sales teams.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => navigate('/login')} className="btn-primary text-base px-8 py-3.5 flex items-center gap-2 shadow-glow-lg">
                Start Free <ArrowRight size={16} />
              </button>
              <a href="#features" className="text-sm text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
                See Features <ArrowRight size={14} />
              </a>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {stats.map((s, i) => (
              <div key={i} className="glass-card p-4 text-center">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">Everything Your Sales Team Needs</h2>
            <p className="mt-4 text-gray-400 text-lg max-w-2xl mx-auto">One platform to manage leads, train your team, track performance, and close more deals.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.05 }}
                className="glass-card p-6 group hover:border-brand-500/20 transition-all duration-300"
              >
                <div className={`w-11 h-11 rounded-xl bg-${f.color}-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon size={20} className={`text-${f.color}-400`} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Teams */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-800/50">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold">One CRM, Four Specialized Teams</h2>
            <p className="mt-4 text-gray-400 text-lg">Each team gets their own playbook, training, and workflow — tailored to their role.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {teams.map((t, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.1 }}
                className="glass-card p-6 relative overflow-hidden group"
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${t.color}`} />
                <h3 className="text-base font-semibold text-white mt-2">{t.name}</h3>
                <p className="text-xs text-gray-400 mt-2">{t.desc}</p>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-500">
                  <CheckCircle2 size={12} className="text-green-400" /> 20-chapter playbook included
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold">How PreSold Works</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Add Leads', desc: 'Capture leads from any source — ads, referrals, calls. Track everything in one place.' },
              { step: '02', title: 'Follow the Journey', desc: '20-step guided process with scripts, examples, and WhatsApp messages for every stage.' },
              { step: '03', title: 'Close Deals', desc: 'Move leads through the pipeline. The playbook and AI help you convert faster.' },
            ].map((item, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.15 }} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-lg font-bold text-brand-400">{item.step}</span>
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <motion.div {...fadeUp} className="max-w-3xl mx-auto text-center glass-card p-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 via-transparent to-purple-600/10" />
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl font-bold">Ready to Pre-Sell Your Customers?</h2>
            <p className="mt-3 text-gray-400">Join PreSold CRM and give your sales team the tools they need to close more deals.</p>
            <button onClick={() => navigate('/login')} className="mt-8 btn-primary text-base px-8 py-3.5 flex items-center gap-2 mx-auto shadow-glow-lg">
              Get Started Now <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logoSrc} alt="PreSold CRM" className="h-7" />
            <span className="text-sm font-semibold text-gray-400">PreSold CRM</span>
          </div>
          <p className="text-xs text-gray-600">Built for real estate sales teams that want to close more deals.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/login')} className="text-xs text-gray-500 hover:text-white transition-colors">Sign In</button>
            <button onClick={() => navigate('/login')} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">Get Started</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
