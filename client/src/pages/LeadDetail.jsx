import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Phone, Mail, Building2, MapPin, Calendar, Upload,
  Check, MessageCircle, FileText, Image, Video, Clock, Send, Trash2,
  ChevronDown, ChevronRight, Globe, Languages, BookOpen, Camera, Edit3,
  Plus, Minus
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const STAGES = ['CONNECT','REPLY','INTEREST','TRUST','TRIAL','DEMO_BOOKED','DEMO_ATTENDED','PROPOSAL_SENT','NEGOTIATION','WON','LOST'];

const JOURNEY_GUIDE = {
  sourced: {
    en: { title: 'Lead is discovered', summary: 'Capture the lead source and contact details before moving ahead.', example: 'Example: A buyer found your listing on HomeIntown and asked about a 2BHK in Dwarka Expressway.' },
    hi: { title: 'लीड खोजा गया', summary: 'अगे बढ़ने से पहले लेड का स्रोत और संपर्क जानकारी रिकॉर्ड करें।', example: 'उदाहरण: कोई ग्राहक आपके प्रॉपर्टी लिस्टिंग को HomeIntown पर खोज रहा था और Dwarka Expressway पर 2BHK के बारे में पूछ रहा है।' }
  },
  qualified: {
    en: { title: 'Lead is qualified', summary: 'Check whether the lead is a real buyer and fits the budget and requirement.', example: 'Example: The buyer wants a 3BHK under ₹1.5 crore in Gurgaon and has a clear financing plan.' },
    hi: { title: 'लीड क्वालिफाइड है', summary: 'जांचें कि यह असली बायर है और उसकी budget व requirement आपके प्रॉपर्टी से मेल खाती है या नहीं।', example: 'उदाहरण: ग्राहक Gurgaon में ₹1.5 करोड़ से कम में 3BHK चाहता है और उसके पास फाइनेंसिंग की स्पष्ट योजना है।' }
  },
  first_dm: {
    en: { title: 'First message sent', summary: 'Send a short, personal intro with the exact property or need in mind.', example: 'Example: “Hi Mr. Sharma, I saw you are looking for a ready-to-move 3BHK near Golf Course Road. I have 2 options for you.”' },
    hi: { title: 'पहला DM भेजा गया', summary: 'संक्षिप्त और personal intro भेजें जिसमें property या buyer की need साफ़ हो।', example: 'उदाहरण: “Hi Mr. Sharma, मुझे पता चला है कि आप Golf Course Road के पास ready-to-move 3BHK की तलाश में हैं। मेरे पास आपके लिए 2 विकल्प हैं।”' }
  },
  reply_received: {
    en: { title: 'Reply opened conversation', summary: 'Use the response to understand their exact requirement and continue positively.', example: 'Example: The lead replied: “Please send the price and location details.” Now share the exact details clearly.' },
    hi: { title: 'रिस्पांस मिला', summary: 'रिस्पांस से buyer की exact requirement समझें और बातचीत को आगे बढ़ाएँ।', example: 'उदाहरण: लेड ने जवाब दिया: “कृपया प्राइस और लोकेशन बताइए।” अब इन details को साफ़ तरीके से साझा करें।' }
  },
  need_identified: {
    en: { title: 'Requirement identified', summary: 'Understand the real need, location priority, and deal-breakers before pitching.', example: 'Example: The buyer wants a family-friendly society, nearby metro, and possession within 12 months.' },
    hi: { title: 'जरूरत पहचान ली गई', summary: 'पिच से पहले buyer की actual need, location priority और deal-breakers समझें।', example: 'उदाहरण: ग्राहक wants a family-friendly society, nearby metro, और 12 महीने में possession चाहता है।' }
  },
  authority_sent: {
    en: { title: 'Property proof shared', summary: 'Send walkthrough videos, floor plans, or project details to build confidence.', example: 'Example: Share a video of the apartment, amenities, and a recent site visit update.' },
    hi: { title: 'property proof साझा किया गया', summary: 'trust बनाने के लिए walkthrough video, floor plan, और project details भेजें।', example: 'उदाहरण: apartment का video, amenities, और recent site visit update भेजें।' }
  },
  trust_content: {
    en: { title: 'Trust content sent', summary: 'Share sample layouts, legal documents, or social proof to reduce hesitation.', example: 'Example: Send a short brochure with locality map, builder reputation, and nearby schools.' },
    hi: { title: 'trust content भेजा गया', summary: 'शक कम करने के लिए sample layout, legal docs, या social proof साझा करें।', example: 'उदाहरण: locality map, builder reputation, और nearby schools वाला short brochure भेजें।' }
  },
  pain_agitated: {
    en: { title: 'Need is emphasized', summary: 'Highlight the urgency so the buyer sees the opportunity clearly.', example: 'Example: “This project is near completion, and the best units are going fast in this price range.”' },
    hi: { title: 'जरूरत को उजागर किया गया', summary: 'buyer को urgency महसूस कराएँ ताकि deal जल्दी हो सके।', example: 'उदाहरण: “यह प्रोजेक्ट पूरा होने वाला है और इस रेंज में best units जल्दी बिक रहे हैं।”' }
  },
  solution_hinted: {
    en: { title: 'Best-fit option introduced', summary: 'Recommend the most relevant property and explain why it fits their needs.', example: 'Example: “This 3BHK in Sector 79 has the right layout, budget fit, and connectivity you wanted.”' },
    hi: { title: 'best-fit option दी गई', summary: 'buyer के लिए सबसे relevant property suggest करें और explain करें कि यह क्यों सही है।', example: 'उदाहरण: “Sector 79 में यह 3BHK आपके budget, layout, और connectivity के हिसाब से सही है।”' }
  },
  trial_offered: {
    en: { title: 'Site visit or offer shared', summary: 'Offer a small next step such as a visit, shortlist, or price discussion.', example: 'Example: Offer a site visit tomorrow evening or share a detailed price sheet for comparison.' },
    hi: { title: 'site visit या offer दिया गया', summary: 'अगला step छोटा दें जैसे site visit, shortlist, या price discussion।', example: 'उदाहरण: कल शाम site visit का समय दें या तुलना के लिए detailed price sheet भेजें।' }
  },
  trial_consumed: {
    en: { title: 'Visit or shortlist accepted', summary: 'Check whether the buyer accepted the next step and is moving ahead.', example: 'Example: They confirmed the site visit or requested the final shortlist of 2 properties.' },
    hi: { title: 'visit या shortlist मंजूर हुआ', summary: 'जांचें कि buyer ने next step accept किया है या नहीं।', example: 'उदाहरण: उन्होंने site visit confirm किया या 2 properties की final shortlist मांगी।' }
  },
  demo_pitched: {
    en: { title: 'Property presentation shared', summary: 'Present the project benefits clearly and explain the buying process.', example: 'Example: “Let’s do a 15-minute walkthrough covering price, amenities, and financing options.”' },
    hi: { title: 'property presentation साझा की गई', summary: 'project के benefits और buying process को साफ़ तरीके से समझाइए।', example: 'उदाहरण: “15-minute walkthrough में हम price, amenities, और financing options को देखें।”' }
  },
  demo_booked: {
    en: { title: 'Site visit or call booked', summary: 'Lock the meeting and confirm the agenda before the customer arrives.', example: 'Example: Confirm the visit time, location, and the exact units to inspect.' },
    hi: { title: 'site visit या call बुक है', summary: 'meeting confirm करें और agenda पहले से तय करें।', example: 'उदाहरण: visit का time, location, और inspect करने वाले exact units confirm करें।' }
  },
  demo_reminder: {
    en: { title: 'Reminder sent', summary: 'Send a check-in message so the buyer shows up and stays engaged.', example: 'Example: “Reminder: tomorrow at 6 PM we will visit the 3BHK and explain the payment plan.”' },
    hi: { title: 'reminder भेजा गया', summary: 'buyer के no-show से बचने के लिए reminder भेजें।', example: 'उदाहरण: “Reminder: कल शाम 6 बजे हम 3BHK visit करेंगे और payment plan समझाएंगे।”' }
  },
  demo_done: {
    en: { title: 'Visit completed', summary: 'Review the feedback and decide the next action in the sale.', example: 'Example: The buyer liked the project but wants a lower floor or better payment schedule.' },
    hi: { title: 'visit पूरा हुआ', summary: 'feedback को देखें और next action तय करें।', example: 'उदाहरण: buyer project से खुश है, लेकिन lower floor या better payment schedule चाहता है।' }
  },
  objections_handled: {
    en: { title: 'Objections addressed', summary: 'Answer concerns clearly about budget, location, or builder trust.', example: 'Example: “The price is slightly higher, but the location and ROI are better than nearby projects.”' },
    hi: { title: 'objections का जवाब दिया गया', summary: 'budget, location, या builder trust जैसे concerns को साफ़ शब्दों में हल करें।', example: 'उदाहरण: “Price थोड़ा higher है, लेकिन location और ROI nearby projects से बेहतर है।”' }
  },
  proposal_sent: {
    en: { title: 'Offer or proposal sent', summary: 'Share a clear pricing, payment plan, and closing timeline.', example: 'Example: Send a proposal with unit price, installation details, possession date, and payment schedule.' },
    hi: { title: 'offer या proposal भेजा गया', summary: 'clear pricing, payment plan, और closing timeline साझा करें।', example: 'उदाहरण: proposal में unit price, installation details, possession date, और payment schedule शामिल करें।' }
  },
  followup_sequence: {
    en: { title: 'Follow-up sequence', summary: 'Stay active with timely reminders and clear next steps.', example: 'Example: Follow up after 2 days with a payment summary and a closing question: “Would you like to move ahead?”' },
    hi: { title: 'follow-up sequence', summary: 'समय पर reminder और clear next steps से momentum बनाए रखें।', example: 'उदाहरण: 2 दिनों बाद payment summary और simple closing question के साथ follow-up करें: “क्या आप आगे बढ़ना चाहते हैं?”' }
  },
  closed_won: {
    en: { title: 'Deal closed', summary: 'The buyer is ready to proceed and the sale is secured.', example: 'Example: The customer confirms the unit, signs the agreement, and proceeds with the booking.' },
    hi: { title: 'deal close हुआ', summary: 'buyer आगे बढ़ने के लिए तैयार है और sale secure हो गया है।', example: 'उदाहरण: customer unit confirm करता है, agreement पर sign करता है, और booking आगे बढ़ाता है।' }
  },
  referral_asked: {
    en: { title: 'Referral requested', summary: 'Ask for introductions from friends or family after a successful deal.', example: 'Example: “If you know anyone else looking for a 2BHK in the same area, I’d be glad to help them.”' },
    hi: { title: 'referral मांगा गया', summary: 'successful deal के बाद friends या family से introduction मांगें।', example: 'उदाहरण: “अगर आपके किसी जानने वाले को same area में 2BHK चाहिए, तो मैं उन्हें मदद gladly कर सकता हूँ।”' }
  }
};

// Sample scripts for each journey step — ready to copy and use
const JOURNEY_SCRIPTS = {
  sourced: `Hi [Name],\n\nThank you for your interest. I'm [Your Name] from [Company]. I'd love to help you find the right property.\n\nCould you share your preferred location and budget? That way I can send you the most relevant options.\n\nLooking forward to assisting you!`,
  qualified: `Hi [Name],\n\nGreat news — based on your requirements ([Budget], [Location], [BHK type]), I've found some options that could be a perfect fit.\n\nWould you be available for a quick 5-minute call today or tomorrow to discuss them?\n\nBest regards,\n[Your Name]`,
  first_dm: `Hi [Name] 👋\n\nI noticed you're looking for a property in [Location]. I have a few excellent options within your budget.\n\nWould you like me to share the details on WhatsApp or email?\n\nHappy to help!`,
  reply_received: `Hi [Name],\n\nThank you for getting back! Here are the details you requested:\n\n📍 Location: [Location]\n💰 Price: [Price]\n🏠 Type: [BHK Type]\n📐 Area: [Sq Ft]\n\nWould you like to schedule a site visit this week?`,
  need_identified: `Hi [Name],\n\nBased on our conversation, I understand you need:\n✅ [Requirement 1]\n✅ [Requirement 2]\n✅ [Requirement 3]\n\nI've shortlisted 2-3 properties that match. Let me share them with you.\n\nShall I send the brochures?`,
  authority_sent: `Hi [Name],\n\nAs discussed, here's the detailed walkthrough of the property:\n\n🎥 Video Tour: [Link]\n📋 Floor Plan: [Link]\n📄 Brochure: [Link]\n\nThe builder has completed 10+ projects with on-time delivery. Let me know your thoughts!\n\nRegards,\n[Your Name]`,
  trust_content: `Hi [Name],\n\nI wanted to share some additional information that might help with your decision:\n\n✅ RERA Registration: [Number]\n✅ Bank Approved: Yes (SBI, HDFC, ICICI)\n✅ Construction Status: [X]% complete\n✅ Happy Homeowners: 200+ families\n\nWould you like to speak with an existing homeowner for reference?`,
  pain_agitated: `Hi [Name],\n\nJust a quick update — the units in your preferred configuration are moving fast. Only [X] units remain in the [Floor] range you liked.\n\nI'd hate for you to miss out on the best options. Would you like to lock in a site visit this weekend?\n\nLet me know!`,
  solution_hinted: `Hi [Name],\n\nBased on everything we've discussed, I believe [Property Name] in [Location] is the best fit for you because:\n\n1️⃣ [Reason 1 - matches their need]\n2️⃣ [Reason 2 - budget fit]\n3️⃣ [Reason 3 - location/connectivity]\n\nShall I arrange a site visit?`,
  trial_offered: `Hi [Name],\n\nI'd like to invite you for a site visit to [Property Name].\n\n📅 Available slots:\n• Saturday 11 AM - 1 PM\n• Sunday 10 AM - 12 PM\n\nThe visit takes about 30 minutes. I'll personally be there to show you around.\n\nWhich time works best for you?`,
  trial_consumed: `Hi [Name],\n\nThank you for visiting [Property Name] today! I hope you liked what you saw.\n\nHere's a quick summary:\n✅ Unit: [Type/Floor]\n✅ Price: [Amount]\n✅ Possession: [Date]\n\nWould you like me to share the payment plan options?`,
  demo_pitched: `Hi [Name],\n\nI'd love to walk you through the complete offering in a 15-minute presentation:\n\n• Detailed floor plans\n• Payment options & EMI calculator\n• Amenities & lifestyle features\n• Construction timeline\n\nWhen would be a good time for a quick call or meeting?`,
  demo_booked: `Hi [Name],\n\nJust confirming our meeting:\n\n📅 Date: [Date]\n⏰ Time: [Time]\n📍 Location: [Address/Online]\n\nI'll have all the details ready including pricing, floor plans, and payment options.\n\nSee you there! 🙌`,
  demo_reminder: `Hi [Name],\n\nFriendly reminder about our meeting tomorrow:\n\n📅 [Date] at [Time]\n📍 [Location]\n\nPlease feel free to bring your family along if they'd like to see the property too.\n\nLooking forward to it!`,
  demo_done: `Hi [Name],\n\nThank you for attending the presentation today! As promised, here's a recap:\n\n📋 Price Sheet: [Link]\n📐 Floor Plan: [Link]\n💰 Payment Plan: [Link]\n\nDo you have any questions? I'm happy to clarify anything.\n\nShall we move forward with the booking?`,
  objections_handled: `Hi [Name],\n\nI completely understand your concern about [Objection].\n\nHere's what I'd like to share:\n• [Point 1 addressing the concern]\n• [Point 2 with proof/data]\n• [Point 3 with testimonial/reference]\n\nMany of our homeowners had the same question initially. Would you like to speak with one of them?\n\nI'm here to help you make the best decision.`,
  proposal_sent: `Hi [Name],\n\nPlease find the detailed proposal attached:\n\n📄 Unit: [Type] - [Floor]\n💰 Total Cost: ₹[Amount]\n📅 Payment Plan: [Type]\n🏦 Bank Loan: Pre-approved\n📆 Possession: [Date]\n\nThe booking amount is ₹[Amount]. Shall I block this unit for you?\n\nThis offer is valid until [Date].`,
  followup_sequence: `Hi [Name],\n\nHope you're doing well! I wanted to share a quick update:\n\n🏗️ Construction Progress: [X]% complete\n📸 Latest Photos: [Link]\n\nAlso, we currently have a special offer: [Offer details]\n\nWould you like to discuss this further?\n\nBest,\n[Your Name]`,
  closed_won: `Hi [Name],\n\nCongratulations on your new home! 🎉🏠\n\nHere's what happens next:\n1️⃣ Agreement signing: [Date]\n2️⃣ Documentation: We'll assist you\n3️⃣ Loan processing: Our team will coordinate\n4️⃣ Possession: [Expected Date]\n\nWelcome to the [Project Name] family!\n\nThank you for trusting us. 🙏`,
  referral_asked: `Hi [Name],\n\nI hope you're enjoying your new home! 🏠\n\nIf any of your friends, family, or colleagues are also looking for a property, I'd be happy to help them the same way.\n\nAs a thank you, we offer [referral benefit] for every successful referral.\n\nJust share their name and number, and I'll take care of the rest!\n\nThank you! 🙏`
};

const getStepScript = (step) => {
  const key = step.key || step.label?.toLowerCase().replace(/[^a-z]+/g, '_');
  return JOURNEY_SCRIPTS[key] || `Hi [Name],\n\nI'm reaching out regarding your interest in our property.\n\n[Customize this message based on the current stage]\n\nLooking forward to hearing from you!\n\nBest regards,\n[Your Name]`;
};

const getStepGuide = (step) => {
  const key = step.key || step.label?.toLowerCase().replace(/[^a-z]+/g, '_');
  return JOURNEY_GUIDE[key] || {
    en: { title: step.label || 'Journey step', summary: 'Complete the required action and continue to the next step.', example: 'Example: Finish this step and then move to the next stage in the journey.' },
    hi: { title: step.label || 'जर्नी स्टेप', summary: 'अपना work पूरा करें और अगले स्टेप पर आगे बढ़ें।', example: 'उदाहरण: इस step को पूरा करें और फिर journey के अगले stage पर जाएँ।' }
  };
};

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [journeySteps, setJourneySteps] = useState([]);
  const [adsJourneySteps, setAdsJourneySteps] = useState([]);
  const [journeyTab, setJourneyTab] = useState('COMMON');
  const [expandedStepId, setExpandedStepId] = useState(null);
  const [language, setLanguage] = useState('en');
  const [customGuides, setCustomGuides] = useState({});
  const [editingStep, setEditingStep] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', summary: '', example: '', script: '' });

  useEffect(() => { loadLead(); loadJourney(); loadCustomGuides(); }, [id]);

  const loadCustomGuides = async () => {
    try {
      const res = await api.get('/journey/guides');
      const map = {};
      (res.data || []).forEach(g => { map[g.stepKey] = g; });
      setCustomGuides(map);
    } catch {}
  };

  const saveGuide = async (stepKey) => {
    try {
      await api.put(`/journey/guides/${stepKey}`, editForm);
      setCustomGuides({ ...customGuides, [stepKey]: { ...editForm, stepKey } });
      setEditingStep(null);
      toast.success('Guide updated for all users!');
    } catch {
      toast.error('Failed to save');
    }
  };

  // Merge custom guide with default
  const getEffectiveGuide = (step) => {
    const key = step.key || step.label?.toLowerCase().replace(/[^a-z]+/g, '_');
    const defaultGuide = getStepGuide(step);
    const custom = customGuides[key];
    if (!custom) return defaultGuide;
    return {
      en: {
        title: custom.title || defaultGuide.en.title,
        summary: custom.summary || defaultGuide.en.summary,
        example: custom.example || defaultGuide.en.example
      },
      hi: defaultGuide.hi
    };
  };

  const getEffectiveScript = (step) => {
    const key = step.key || step.label?.toLowerCase().replace(/[^a-z]+/g, '_');
    const custom = customGuides[key];
    return custom?.script || getStepScript(step);
  };

  const loadLead = async () => {
    try {
      const res = await api.get(`/leads/${id}`);
      setLead(res.data);
    } catch { toast.error('Lead not found'); navigate('/leads'); }
    setLoading(false);
  };

  const loadJourney = async () => {
    try {
      const [commonStepsRes, adsStepsRes, progressRes] = await Promise.all([
        api.get('/journey/steps?category=COMMON'),
        api.get('/journey/steps?category=ADS'),
        api.get(`/journey/progress/${id}`)
      ]);
      const mapProgress = (steps) => steps.map(step => {
        const prog = progressRes.data.find(p => p.stepId === step.id);
        return { ...step, completed: prog?.completed || false, progressId: prog?.id };
      });
      setJourneySteps(mapProgress(commonStepsRes.data));
      setAdsJourneySteps(mapProgress(adsStepsRes.data));
    } catch {}
  };

  const updateStage = async (stage) => {
    try {
      const res = await api.put(`/leads/${id}`, { stage });
      setLead(res.data.lead);
      if (res.data.xpGain) toast.success(`+${res.data.xpGain} XP — ${stage === 'WON' ? 'Deal won! 🎉' : 'Stage updated!'}`);
    } catch { toast.error('Update failed'); }
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      await api.post(`/leads/${id}/notes`, { content: note });
      setNote('');
      loadLead();
      toast.success('Note added');
    } catch { toast.error('Failed to add note'); }
  };

  const toggleStep = async (stepId) => {
    const step = journeySteps.find(s => s.id === stepId);
    if (!step) return;

    const previousStep = journeySteps.find(s => s.order === step.order - 1);
    const isLocked = step.order > 1 && !previousStep?.completed;
    if (isLocked) {
      toast.error(`Complete "${previousStep.label}" first`);
      return;
    }

    try {
      const res = await api.post('/journey/toggle', { leadId: id, stepId });
      setJourneySteps(journeySteps.map(s => s.id === stepId ? { ...s, completed: res.data.progress.completed } : s));
      if (res.data.xpGain) toast.success(`+${res.data.xpGain} XP — Step done! ✅`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update step');
    }
  };

  const toggleExpand = (stepId) => {
    setExpandedStepId(prev => prev === stepId ? null : stepId);
  };

  const adminAdjustJourney = async (action, category = 'COMMON') => {
    if (action === 'add') {
      const label = prompt(`Enter the name for the new ${category === 'ADS' ? 'Ads' : 'Common'} journey step:`);
      if (!label || !label.trim()) return;
      try {
        await api.post('/journey/steps/add', { label: label.trim(), category });
        await loadJourney();
        toast.success(`Step "${label.trim()}" added ✅`);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to add step');
      }
    }
  };

  const adminRemoveStep = async (step) => {
    const confirmed = confirm(`Remove step "${step.label}"? This will delete all progress for this step across all leads.`);
    if (!confirmed) return;
    try {
      await api.delete(`/journey/steps/${step.id}`);
      await loadJourney();
      toast.success(`Step "${step.label}" removed`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove step');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post(`/uploads/lead/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('File uploaded! 📎');
      loadLead();
    } catch { toast.error('Upload failed'); }
    e.target.value = '';
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!lead) return null;

  const completedCount = journeySteps.filter(s => s.completed).length;
  const progress = Math.round((completedCount / Math.max(journeySteps.length, 1)) * 100);
  const adsCompletedCount = adsJourneySteps.filter(s => s.completed).length;
  const adsProgress = Math.round((adsCompletedCount / Math.max(adsJourneySteps.length, 1)) * 100);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <button onClick={() => navigate('/leads')} className="btn-ghost flex items-center gap-2 text-sm -ml-3">
        <ArrowLeft size={16} /> Back to Leads
      </button>

      {/* Lead Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-600/20 flex items-center justify-center">
              <span className="text-xl font-bold text-brand-400">{lead.fullName[0]}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{lead.fullName}</h1>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                {lead.company && <span className="flex items-center gap-1"><Building2 size={11} /> {lead.company}</span>}
                {lead.location && <span className="flex items-center gap-1"><MapPin size={11} /> {lead.location}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={`tel:${lead.phone}`} className="btn-primary text-sm flex items-center gap-2"><Phone size={14} /> Call</a>
            <a href={`https://wa.me/${lead.phone}`} target="_blank" rel="noreferrer" className="btn-secondary text-sm flex items-center gap-2"><MessageCircle size={14} /> WhatsApp</a>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Pipeline + Journey */}
        <div className="lg:col-span-2 space-y-4">
          {/* Pipeline Stages */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Pipeline Stage</h3>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map(s => (
                <button
                  key={s} onClick={() => updateStage(s)}
                  className={`text-[10px] font-medium px-3 py-1.5 rounded-lg transition-all active:scale-95
                    ${lead.stage === s ? 'bg-brand-600 text-white shadow-glow' : 'bg-dark-600 text-gray-400 hover:bg-dark-500 hover:text-white'}`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Journey Steps — Tabbed */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => setJourneyTab('COMMON')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${journeyTab === 'COMMON' ? 'bg-brand-600 text-white shadow-glow' : 'bg-dark-600 text-gray-400 hover:bg-dark-500 hover:text-white'}`}
              >
                Lead Journey
              </button>
              <button
                type="button"
                onClick={() => setJourneyTab('ADS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${journeyTab === 'ADS' ? 'bg-amber-600 text-white shadow-glow' : 'bg-dark-600 text-gray-400 hover:bg-dark-500 hover:text-white'}`}
              >
                Ads Lead Journey
              </button>
            </div>

            {journeyTab === 'COMMON' && (
              <JourneyBlock
                title="Lead Journey"
                steps={journeySteps}
                completedCount={completedCount}
                progress={progress}
                category="COMMON"
                language={language}
                setLanguage={setLanguage}
                isAdmin={isAdmin}
                expandedStepId={expandedStepId}
                toggleExpand={toggleExpand}
                toggleStep={toggleStep}
                adminAdjustJourney={adminAdjustJourney}
                adminRemoveStep={adminRemoveStep}
                getEffectiveGuide={getEffectiveGuide}
                getEffectiveScript={getEffectiveScript}
                editingStep={editingStep}
                setEditingStep={setEditingStep}
                editForm={editForm}
                setEditForm={setEditForm}
                saveGuide={saveGuide}
                lead={lead}
                navigate={navigate}
              />
            )}

            {journeyTab === 'ADS' && (
              <JourneyBlock
                title="Ads Lead Journey"
                steps={adsJourneySteps}
                completedCount={adsCompletedCount}
                progress={adsProgress}
                category="ADS"
                language={language}
                setLanguage={setLanguage}
                isAdmin={isAdmin}
                expandedStepId={expandedStepId}
                toggleExpand={toggleExpand}
                toggleStep={toggleStep}
                adminAdjustJourney={adminAdjustJourney}
                adminRemoveStep={adminRemoveStep}
                getEffectiveGuide={getEffectiveGuide}
                getEffectiveScript={getEffectiveScript}
                editingStep={editingStep}
                setEditingStep={setEditingStep}
                editForm={editForm}
                setEditForm={setEditForm}
                saveGuide={saveGuide}
                lead={lead}
                navigate={navigate}
              />
            )}
          </div>

          {/* Notes */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Notes</h3>
            <form onSubmit={addNote} className="flex gap-2 mb-3">
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note..." className="input-field text-sm flex-1" />
              <button type="submit" className="btn-primary px-3"><Send size={14} /></button>
            </form>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {lead.notes?.map(n => (
                <div key={n.id} className="bg-dark-600/30 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-gray-300">{n.content}</p>
                  <p className="text-[10px] text-gray-600 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Info Card */}
          <div className="glass-card p-5 space-y-4 border border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Lead Details</h3>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                lead.temperature === 'HOT' ? 'bg-red-500/20 text-red-400' :
                lead.temperature === 'WARM' ? 'bg-amber-500/20 text-amber-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {lead.temperature === 'HOT' ? '🔥' : lead.temperature === 'WARM' ? '☀️' : '❄️'} {lead.temperature}
              </span>
            </div>

            <div className="space-y-0">
              <InfoRow label="Phone" value={lead.phone} />
              <InfoRow label="Email" value={lead.email} />
              <InfoRow label="Company" value={lead.company} />
              <InfoRow label="Location" value={lead.location} />
              <InfoRow label="Budget" value={lead.budget} />
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-[11px] text-gray-500 uppercase tracking-wider">Source</span>
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-brand-500/15 text-brand-400">{lead.source?.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-[11px] text-gray-500 uppercase tracking-wider">Priority</span>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                  lead.priority === 'HIGH' ? 'bg-red-500/15 text-red-400' :
                  lead.priority === 'MEDIUM' ? 'bg-amber-500/15 text-amber-400' :
                  'bg-green-500/15 text-green-400'
                }`}>{lead.priority}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-[11px] text-gray-500 uppercase tracking-wider">Ads Running</span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api.put(`/leads/${lead.id}`, { adsRunning: !lead.adsRunning });
                      setLead({ ...lead, adsRunning: !lead.adsRunning });
                      toast.success(`Ads ${!lead.adsRunning ? 'enabled' : 'disabled'}`);
                    } catch { toast.error('Failed to update'); }
                  }}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-all ${lead.adsRunning ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 ring-1 ring-green-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-1 ring-red-500/30'}`}
                >
                  {lead.adsRunning ? '● YES' : '○ NO'}
                </button>
              </div>
              <InfoRow label="Created" value={new Date(lead.createdAt).toLocaleDateString()} />
            </div>

            {lead.assignedTo && (
              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-brand-400">{lead.assignedTo.name?.[0]}</span>
                </div>
                <div>
                  <p className="text-[11px] text-white font-medium">{lead.assignedTo.name}</p>
                  <p className="text-[9px] text-gray-500">Assigned</p>
                </div>
              </div>
            )}
          </div>

          {/* File Upload */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Files</h3>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl p-6 cursor-pointer hover:border-brand-500/30 transition-colors">
              <Upload size={20} className="text-gray-500 mb-2" />
              <span className="text-xs text-gray-500">Upload file</span>
              <input type="file" className="hidden" onChange={handleFileUpload} />
            </label>
            {lead.files?.length > 0 && (
              <div className="space-y-2 mt-3">
                {lead.files.map(f => (
                  <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-600/30 hover:bg-dark-600/50 transition-colors">
                    {f.type === 'IMAGE' ? <Image size={12} className="text-pink-400" /> : f.type === 'VIDEO' ? <Video size={12} className="text-red-400" /> : <FileText size={12} className="text-blue-400" />}
                    <span className="text-[10px] text-gray-400 truncate flex-1">{f.originalName}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Activity Timeline</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {lead.activities?.map(a => (
                <div key={a.id} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-gray-300">{a.title}</p>
                    <p className="text-[10px] text-gray-600">{new Date(a.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {!lead.activities?.length && <p className="text-xs text-gray-600 text-center py-4">No activities yet</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Journey Block Component ─────────────────────────────────────────────────
function JourneyBlock({ title, steps, completedCount, progress, category, language, setLanguage, isAdmin, expandedStepId, toggleExpand, toggleStep, adminAdjustJourney, adminRemoveStep, getEffectiveGuide, getEffectiveScript, editingStep, setEditingStep, editForm, setEditForm, saveGuide, lead, navigate }) {
  const gradientClass = category === 'ADS'
    ? 'from-amber-500 to-orange-500'
    : 'from-brand-500 to-green-500';
  const borderAccent = category === 'ADS' ? 'border-amber-500/30' : 'border-brand-500/30';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1.5 rounded-lg border border-brand-500/30 bg-brand-600/10 px-2 py-1 text-[10px] font-medium text-brand-300 hover:bg-brand-600/20"
          >
            <Languages size={11} /> {language === 'en' ? 'हिंदी' : 'English'}
          </button>
          {isAdmin && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => adminAdjustJourney('add', category)}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 transition-colors"
                title={`Add new ${category === 'ADS' ? 'Ads' : 'Common'} journey step (Admin)`}
              >
                <Plus size={12} strokeWidth={3} />
              </button>
            </div>
          )}
          <span className="text-xs text-brand-400 font-medium">{completedCount}/{steps.length} • {progress}%</span>
        </div>
      </div>
      <div className="h-2 bg-dark-600 rounded-full overflow-hidden mb-4">
        <div className={`h-full bg-gradient-to-r ${gradientClass} rounded-full transition-all duration-500`} style={{ width: `${progress}%` }} />
      </div>
      {steps.length === 0 && (
        <p className="text-xs text-gray-500 text-center py-4">No steps yet. {isAdmin ? 'Click + to add one.' : ''}</p>
      )}
      <div className="space-y-2.5 max-h-[26rem] overflow-y-auto pr-1">
        {steps.map((step, i) => {
          const previousStep = steps.find(s => s.order === step.order - 1);
          const isLocked = step.order > 1 && !previousStep?.completed;
          const isExpanded = expandedStepId === step.id;
          const guide = getEffectiveGuide(step);
          const currentGuide = language === 'hi' ? guide.hi : guide.en;
          const effectiveScript = getEffectiveScript(step);
          const stepKey = step.key || step.label?.toLowerCase().replace(/[^a-z]+/g, '_');

          return (
            <div key={step.id} className={`rounded-xl border transition-all ${step.completed ? 'border-green-500/10 bg-green-500/5' : isLocked ? 'border-white/5 bg-dark-700/40 opacity-75' : 'border-white/5 bg-dark-600/30 hover:border-brand-500/20'}`}>
              <div
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                onClick={() => !isLocked && toggleExpand(step.id)}
                title={isLocked ? `Complete "${previousStep?.label || 'previous step'}" first` : ''}
              >
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); if (!isLocked) toggleStep(step.id); }}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${step.completed ? 'bg-green-500 border-green-500' : isLocked ? 'border-gray-700 bg-dark-800 cursor-not-allowed' : 'border-brand-400 bg-dark-700 hover:border-brand-300'}`}
                  aria-label={step.completed ? 'Mark step incomplete' : 'Mark step complete'}
                >
                  {step.completed ? <Check size={10} className="text-white" strokeWidth={3} /> : isLocked ? <span className="text-[8px] text-gray-500">🔒</span> : null}
                </button>
                <span className="text-[10px] font-bold text-gray-600 w-5">{i + 1}</span>
                <span className={`text-xs flex-1 ${step.completed ? 'text-green-400 line-through opacity-70' : isLocked ? 'text-gray-500' : 'text-gray-300'}`}>
                  {language === 'hi' ? (step.label ? step.label : (currentGuide.hi?.title || step.label)) : step.label}
                </span>
                {!isLocked && (
                  <span className="flex items-center justify-center w-5 h-5 rounded-md bg-dark-800/70 text-gray-400">
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </span>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); adminRemoveStep(step); }}
                    className="w-5 h-5 flex items-center justify-center rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/25 transition-colors"
                    title={`Remove "${step.label}"`}
                  >
                    <Minus size={10} strokeWidth={3} />
                  </button>
                )}
                {isLocked && <span className="text-[9px] uppercase tracking-wide text-gray-500">Locked</span>}
              </div>

              {isExpanded && !isLocked && (
                <div className="border-t border-white/5 px-3 py-3 bg-dark-900/30">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-300">{language === 'hi' ? 'गाइड' : 'Guide'}</p>
                    <button
                      type="button"
                      onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
                      className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[9px] text-gray-300"
                    >
                      <Globe size={10} /> {language === 'en' ? 'हिंदी' : 'EN'}
                    </button>
                  </div>
                  <p className="text-sm font-medium text-white mb-1">{currentGuide.title}</p>
                  <p className="text-[11px] leading-relaxed text-gray-300">{currentGuide.summary}</p>
                  <div className="mt-2 rounded-lg border border-brand-500/20 bg-brand-600/5 p-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-300 mb-1">{language === 'hi' ? 'उदाहरण' : 'Example'}</p>
                    <p className="text-[11px] leading-relaxed text-gray-200">{currentGuide.example}</p>
                  </div>

                  {/* Admin Edit Button */}
                  {isAdmin && editingStep !== stepKey && (
                    <button
                      onClick={() => { setEditingStep(stepKey); setEditForm({ title: currentGuide.title || '', summary: currentGuide.summary || '', example: currentGuide.example || '', script: effectiveScript || '' }); }}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/30 transition-colors"
                    >
                      <Edit3 size={12} /> Edit Guide & Script (applies to all teams)
                    </button>
                  )}

                  {/* Admin Edit Form */}
                  {isAdmin && editingStep === stepKey && (
                    <div className="mt-3 p-3 rounded-xl bg-dark-900 border border-amber-500/20 space-y-2">
                      <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Edit Guide (visible to all users)</p>
                      <input type="text" placeholder="Title" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} className="input-field text-xs" />
                      <textarea placeholder="Summary / Description" value={editForm.summary} onChange={e => setEditForm({ ...editForm, summary: e.target.value })} className="input-field text-xs" rows={2} />
                      <textarea placeholder="Example" value={editForm.example} onChange={e => setEditForm({ ...editForm, example: e.target.value })} className="input-field text-xs" rows={2} />
                      <textarea placeholder="Script template" value={editForm.script} onChange={e => setEditForm({ ...editForm, script: e.target.value })} className="input-field text-xs" rows={4} />
                      <div className="flex gap-2">
                        <button onClick={() => saveGuide(stepKey)} className="btn-primary text-xs px-3 py-1.5">Save for All Users</button>
                        <button onClick={() => setEditingStep(null)} className="text-xs text-gray-500 hover:text-white">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Sample Script */}
                  <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-600/5 p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-400 flex items-center gap-1">
                        <MessageCircle size={10} /> Sample Script
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(effectiveScript.replace(/\\n/g, '\n'));
                          toast.success('Script copied to clipboard!');
                        }}
                        className="text-[9px] font-medium px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-[11px] leading-relaxed text-gray-200 whitespace-pre-line">{effectiveScript}</p>
                  </div>

                  {/* Media Upload & Display */}
                  <JourneyStepMedia stepKey={step.key} />

                  <button
                    type="button"
                    onClick={() => navigate(`/playbook?chapter=${step.order}`)}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium hover:bg-brand-500/20 transition-colors"
                  >
                    <BookOpen size={13} />
                    {language === 'hi' ? `प्लेबुक चैप्टर ${step.order} पढ़ें` : `Read Playbook Chapter ${step.order}`}
                  </button>
                  {lead.phone && (
                    <a
                      href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '').replace(/^0+/, '91')}?text=${encodeURIComponent(effectiveScript.replace(/\\n/g, '\n').replace(/\[Name\]/g, lead.fullName || ''))}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors"
                    >
                      <MessageCircle size={13} />
                      {language === 'hi' ? 'WhatsApp पर भेजें' : 'Send via WhatsApp'}
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Journey Step Media Component ────────────────────────────────────────────
function JourneyStepMedia({ stepKey }) {
  const [media, setMedia] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadMedia();
  }, [stepKey]);

  const loadMedia = async () => {
    try {
      const res = await api.get(`/journey/media/${stepKey}`);
      setMedia(res.data || []);
    } catch {}
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post(`/journey/media/${stepKey}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Uploaded! Awaiting admin approval.');
      loadMedia();
    } catch {
      toast.error('Upload failed');
    }
    setUploading(false);
    e.target.value = '';
  };

  return (
    <div className="mt-3">
      {/* Approved media display */}
      {media.filter(m => m.approved).length > 0 && (
        <div className="space-y-2 mb-2">
          {media.filter(m => m.approved).map(m => (
            <div key={m.id} className="rounded-lg overflow-hidden border border-white/10">
              {m.type === 'IMAGE' && <img src={m.url} alt={m.originalName} className="w-full max-h-48 object-cover" />}
              {m.type === 'VIDEO' && <video src={m.url} controls className="w-full max-h-48" />}
            </div>
          ))}
        </div>
      )}

      {/* Pending uploads (show to uploader as "pending") */}
      {media.filter(m => !m.approved).length > 0 && (
        <div className="space-y-1 mb-2">
          {media.filter(m => !m.approved).map(m => (
            <div key={m.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <span className="text-[10px] text-amber-400">⏳ Pending approval:</span>
              <span className="text-[10px] text-gray-400 truncate flex-1">{m.originalName}</span>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/10 bg-dark-700/30 cursor-pointer hover:border-pink-500/30 hover:bg-pink-500/5 transition-colors">
        {uploading ? (
          <div className="w-3 h-3 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Camera size={12} className="text-pink-400" />
        )}
        <span className="text-[10px] text-gray-400">{uploading ? 'Uploading...' : 'Upload Photo / Video'}</span>
        <input type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} disabled={uploading} />
      </label>
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-[11px] text-gray-500 uppercase tracking-wider">{label}</span>
      <span className="text-xs text-white font-medium">{value}</span>
    </div>
  );
}
