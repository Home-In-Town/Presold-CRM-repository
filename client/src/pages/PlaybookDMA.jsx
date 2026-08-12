import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronUp, Check, Copy, Search, Bookmark,
  BookOpen, Clock, ArrowLeft, ArrowRight, X, Trophy,
  CheckCircle2, Printer, Download
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const XP_PER_CHAPTER = 15;
const TOTAL_CHAPTERS = 20;
const TOTAL_XP = TOTAL_CHAPTERS * XP_PER_CHAPTER;

const CHAPTERS = [
  {
    id: 1,
    title: 'Understanding the White Label Business Model',
    readingTime: 2,
    keyTakeaway: 'Always explain that OneEmployee is a business growth opportunity, not just another software product.',
    content: `Many agency owners want to grow their business, but building their own CRM or software requires a huge investment, technical knowledge, and continuous maintenance. This often stops them from expanding their services.

The OneEmployee White Label Program solves this problem by allowing agencies to sell a complete CRM under their own brand without building the technology themselves. Instead of spending months creating software, they can start selling immediately and earn recurring monthly revenue.

Your job is not to sell software. Your job is to show agencies how they can grow their business with a ready-made solution.

Example

A digital marketing agency only offers Meta Ads and Website Development. After joining the OneEmployee White Label Program, they also start selling CRM solutions under their own brand. Within six months, they add ₹2 lakh in monthly recurring revenue without hiring developers.

Implementation

Always explain that OneEmployee is a business growth opportunity, not just another software product.`
  },
  {
    id: 2,
    title: 'Find Agencies That Can Actually Grow',
    readingTime: 2,
    keyTakeaway: 'Before contacting any agency, check their website, social media, and services to see if they are a good fit.',
    content: `Not every agency is the right partner. Some are too small, while others don't work with businesses that need CRM solutions.

Focus on agencies that already provide services like Meta Ads, Google Ads, SEO, Website Development, Branding, Lead Generation, or AI Automation. These agencies already have business clients, making it much easier for them to sell OneEmployee.

Choosing the right partner saves time and increases your chances of long-term success.

Example

Agency A designs wedding invitations.

Agency B manages Meta Ads for real estate builders.

Agency B is the better partner because their clients already need CRM and lead management solutions.

Implementation

Before contacting any agency, check their website, social media, and services to see if they are a good fit.`
  },
  {
    id: 3,
    title: 'Research Before You Reach Out',
    readingTime: 2,
    keyTakeaway: 'Research every agency for at least 10 minutes before making the first call.',
    content: `The first conversation should never begin with a sales pitch. Spend a few minutes understanding the agency's business before making contact.

Learn about their services, clients, industries, and recent work. This helps you start a meaningful conversation instead of sounding like a cold caller.

Agency owners appreciate people who have taken the time to understand their business.

Example

Instead of saying,
"Hi, I'm calling about OneEmployee."

Say,
"I noticed your agency manages marketing for several real estate companies. Have you ever thought about offering your clients a branded CRM along with your marketing services?"

The conversation immediately becomes more relevant.

Implementation

Research every agency for at least 10 minutes before making the first call.`
  },
  {
    id: 4,
    title: 'Sell Growth, Not Software',
    readingTime: 2,
    keyTakeaway: 'During every meeting, explain how the agency earns more money, not just how the software works.',
    content: `Agency owners are not looking for another tool. They are looking for ways to increase profits, keep clients longer, and stand out from competitors.

Instead of explaining software features, explain how OneEmployee helps agencies create recurring income, improve client retention, and offer premium services without building anything themselves.

People buy business opportunities, not software features.

Example

Instead of saying,
"Our CRM has WhatsApp Automation and Lead Tracking."

Say,
"Imagine offering your clients a branded CRM that generates monthly recurring income while increasing the value of your marketing services."

That conversation focuses on growth instead of technology.

Implementation

During every meeting, explain how the agency earns more money, not just how the software works.`
  },
  {
    id: 5,
    title: 'Build Partnerships, Not Customers',
    readingTime: 2,
    keyTakeaway: 'Ask yourself after every meeting: "Did I help this agency grow its business today?"',
    content: `A White Label partner is not a one-time customer. They are a long-term business partner.

Your success depends on helping your partners succeed. Support them with training, marketing materials, product updates, and sales guidance. When their business grows, OneEmployee grows too.

The strongest partnerships are built on trust, communication, and continuous support.

Example

After onboarding an agency, don't disappear.

Schedule monthly meetings, review their progress, help them close their first clients, and provide new sales resources whenever needed.

The agency will see OneEmployee as a trusted partner instead of just a software provider.

Implementation

Ask yourself after every meeting:
"Did I help this agency grow its business today?"

If the answer is yes, you're building a partnership—not just making a sale.`
  },
  {
    id: 6,
    title: 'Present the White Label Opportunity, Not the Software',
    readingTime: 3,
    keyTakeaway: 'During every presentation, spend more time explaining the agency\'s earning potential than discussing technical features.',
    content: `Many agency owners already use different tools for managing their clients. If you start your presentation by explaining CRM features, they may think you're selling just another software subscription.

Instead, explain how OneEmployee helps agencies grow their business. Show them that they can offer CRM, AI automation, WhatsApp automation, and lead management under their own brand without spending years developing a platform.

When agency owners see the business opportunity, they become interested in the software naturally.

Remember, agencies are looking for new revenue streams, not more work.

Example

Instead of saying,
"Our platform has lead management, employee management, and WhatsApp automation."

Say,
"Imagine offering your clients a complete CRM under your own company name and earning monthly recurring revenue from every client, while we manage the technology in the background."

Now you're selling growth, not software.

Implementation

During every presentation, spend more time explaining the agency's earning potential than discussing technical features.`
  },
  {
    id: 7,
    title: 'Deliver a Demo That Excites Agency Owners',
    readingTime: 2,
    keyTakeaway: 'Keep every demo focused on solving business problems and helping the agency visualize future growth.',
    content: `A product demo should answer one important question:
"How will this help my agency grow?"

Avoid clicking through every feature in the dashboard. Instead, focus on the parts that matter most to agency owners—branding, client management, automation, reporting, and recurring income.

Show them how easy it is to onboard clients, manage subscriptions, and provide a professional experience under their own brand.

A simple, focused demo creates confidence.

A long, complicated demo creates confusion.

Example

An agency owner asks,
"Can I use my own logo and company name?"

Instead of explaining every dashboard menu, show them a live example of a branded portal with the agency's logo, colors, and domain.

Within minutes, they begin imagining the platform as their own product.

Implementation

Keep every demo focused on solving business problems and helping the agency visualize future growth.`
  },
  {
    id: 8,
    title: 'Handle Partnership Objections with Confidence',
    readingTime: 3,
    keyTakeaway: 'Every objection should begin with understanding the partner\'s concern before offering a solution.',
    content: `Every agency owner will have questions before joining the White Label Program. Some will worry about pricing, while others may wonder if their clients will actually buy the platform.

Never argue with objections.

Understand them first.

Ask questions.

Provide honest answers.

The goal is not to prove the customer wrong.

The goal is to remove uncertainty.

Confidence grows when people feel understood.

Example

An agency owner says,
"Our clients only ask for digital marketing, not CRM."

Instead of replying,
"You're wrong."

Say,
"That's completely understandable. May I ask how many of your clients struggle with managing leads or following up with enquiries?"

The agency owner begins thinking about problems they already see every day.

Now the CRM becomes a logical solution.

Implementation

Every objection should begin with understanding the partner's concern before offering a solution.`
  },
  {
    id: 9,
    title: 'Explain Recurring Revenue Clearly',
    readingTime: 2,
    keyTakeaway: 'Always explain long-term earnings instead of focusing only on the partnership fee.',
    content: `One of the biggest advantages of the White Label Program is recurring monthly income. Unfortunately, many salespeople fail to explain this clearly.

Agency owners often think only about today's sale.

Help them think about the next three years.

Explain how every new client they onboard creates recurring monthly revenue instead of one-time income.

When agencies understand the long-term financial benefit, they stop comparing the partnership only by its initial cost.

Recurring revenue creates predictable business growth.

That is what agency owners want.

Example

Suppose an agency signs 20 businesses over the next year.

Each client pays a monthly subscription.

Instead of earning once from website development, the agency now receives recurring income every month while continuing to provide marketing services.

Their business becomes more stable and more valuable.

Implementation

Always explain long-term earnings instead of focusing only on the partnership fee.`
  },
  {
    id: 10,
    title: 'Close Partnerships by Building Confidence',
    readingTime: 3,
    keyTakeaway: 'Every meeting should end with one clear next step. Clear direction builds confidence and moves the partnership forward.',
    content: `Joining a White Label Program is a business decision, not an impulse purchase.

Agency owners need confidence before they commit.

By the time you ask for the partnership, they should clearly understand:
• How the platform works.
• How they will earn money.
• How onboarding happens.
• What support they will receive.
• How OneEmployee will help them grow.

Never pressure an agency to sign immediately.

Instead, guide them toward the next step with clarity and confidence.

People don't like being sold.

They like making informed business decisions.

Example

Instead of saying,
"Can you sign the agreement today?"

Say,
"Based on everything we've discussed, it seems OneEmployee can help your agency generate recurring revenue while expanding your service offerings. Shall we begin your partner onboarding this week so your team can start preparing for your first client?"

The conversation feels collaborative rather than sales-driven.

Implementation

Every meeting should end with one clear next step—whether it's onboarding, a follow-up meeting, or introducing other decision-makers. Clear direction builds confidence and moves the partnership forward.`
  },
  {
    id: 11,
    title: 'Help Every Partner Launch Their First Client',
    readingTime: 3,
    keyTakeaway: 'Make it your goal to help every new partner onboard their first paying client within the first 30 days.',
    content: `The success of a White Label Partner is not measured by signing the agreement. It is measured by helping them onboard their first paying client.

Many agencies join a partnership with excitement but lose confidence if they don't make their first sale quickly. This is where your support becomes valuable.

Guide the partner through the entire process. Help them identify potential clients, prepare sales presentations, explain pricing, and conduct their first product demo. Your involvement during the early stages builds confidence and creates momentum.

A partner who achieves success quickly is more likely to remain active and grow with OneEmployee.

Example

An agency joins the White Label Program but doesn't know which client to approach first.

Instead of waiting, you suggest they contact one of their existing real estate clients who already uses Meta Ads. You help prepare the proposal and attend the first demo.

The agency successfully closes its first CRM client and gains confidence to approach more businesses.

Implementation

Make it your goal to help every new partner onboard their first paying client within the first 30 days.`
  },
  {
    id: 12,
    title: 'Support Partners Like a Business Coach',
    readingTime: 2,
    keyTakeaway: 'Schedule one growth meeting with every active partner every month.',
    content: `A White Label Partner needs more than technical support. They need guidance on how to sell, grow, and retain clients.

Instead of waiting for partners to contact you only when they face problems, schedule regular discussions to review their progress. Share sales ideas, marketing strategies, and practical advice that helps them improve.

When partners see you as someone who contributes to their growth, they build stronger trust in OneEmployee.

The stronger your partners become, the stronger your network becomes.

Example

During a monthly review, you notice an agency has signed only one client in two months.

Instead of discussing software features, you suggest offering CRM as an add-on service to every website and digital marketing client.

Within the next month, the agency signs three more businesses.

Your advice helped grow their business.

Implementation

Schedule one growth meeting with every active partner every month.`
  },
  {
    id: 13,
    title: 'Help Partners Sell More with Better Marketing',
    readingTime: 2,
    keyTakeaway: 'Ensure every new partner receives a complete sales and marketing toolkit during onboarding.',
    content: `Even the best product becomes difficult to sell without proper marketing materials.

Many agencies struggle because they don't know how to explain the value of the platform to their clients.

Support your partners by providing brochures, proposal templates, social media creatives, demo videos, email templates, and sales presentations.

When agencies receive ready-to-use marketing resources, they spend less time creating content and more time closing clients.

Your goal is to make selling as simple as possible.

Example

A new agency wants to promote CRM services but has no promotional material.

You provide them with branded social media posts, a landing page template, and a professional sales presentation.

Instead of spending days creating content, the agency starts approaching clients immediately.

Good marketing helps partners generate faster results.

Implementation

Ensure every new partner receives a complete sales and marketing toolkit during onboarding.`
  },
  {
    id: 14,
    title: 'Build Relationships That Last for Years',
    readingTime: 2,
    keyTakeaway: 'Treat every partner as a long-term business relationship, not just another customer.',
    content: `A White Label Partnership is not a one-time transaction. It is a long-term business relationship.

Stay connected with your partners through regular calls, training sessions, webinars, and product updates. Celebrate their achievements and support them during challenges.

Strong communication creates loyalty.

Partners who feel valued are more likely to continue growing with OneEmployee instead of looking for other solutions.

Remember, businesses stay where they feel supported.

Example

An agency completes one successful year as a White Label Partner.

Instead of simply renewing the agreement, you congratulate them, review their business growth, discuss future goals, and introduce new features that can help them scale further.

The agency feels appreciated and becomes even more committed to the partnership.

Implementation

Treat every partner as a long-term business relationship, not just another customer.`
  },
  {
    id: 15,
    title: 'Grow Monthly Recurring Revenue Together',
    readingTime: 3,
    keyTakeaway: 'During every quarterly review, help partners identify at least one new service they can offer to increase recurring revenue.',
    content: `The real strength of a White Label business is recurring income.

Every new client an agency signs increases its monthly recurring revenue (MRR), creating a stable and predictable business.

Help your partners understand that long-term growth comes from keeping existing clients happy while continuously adding new ones.

Encourage agencies to offer additional services such as AI Automation, WhatsApp Automation, Employee Management, Attendance Systems, and Lead Management alongside the CRM.

The more value they provide, the more their business grows.

When your partners succeed financially, OneEmployee succeeds too.

Example

An agency initially sells only CRM subscriptions.

After discussing growth opportunities, they begin offering WhatsApp Automation and AI-powered Lead Management as additional services.

Their average revenue per client increases significantly without finding new customers.

Small improvements create long-term business growth.

Implementation

During every quarterly review, help partners identify at least one new service they can offer to increase recurring revenue and strengthen client relationships.`
  },
  {
    id: 16,
    title: 'Solve Partner Problems Before They Become Bigger',
    readingTime: 2,
    keyTakeaway: 'Respond to every partner query quickly and always follow up to confirm the issue has been resolved.',
    content: `Every business faces challenges. A White Label Partner may experience technical questions, onboarding delays, billing concerns, or difficulty selling to clients. What separates a great Partner Success Manager from an average one is how quickly these problems are solved.

Never wait for a partner to become frustrated. Stay in regular contact and identify problems early. A quick response builds confidence, while delayed support can damage the partnership.

Your responsibility is not just to provide answers but to help partners continue growing without interruptions.

Example

An agency informs you that one of their clients is confused about setting up WhatsApp Automation.

Instead of simply sending a help document, you schedule a quick video call, guide them through the setup, and ensure everything works before ending the meeting.

The agency feels supported and gains confidence in recommending OneEmployee to future clients.

Implementation

Respond to every partner query quickly and always follow up to confirm the issue has been resolved.`
  },
  {
    id: 17,
    title: 'Help Partners Expand Their Business',
    readingTime: 2,
    keyTakeaway: 'During every review meeting, recommend at least one new service that the partner can confidently introduce to their existing clients.',
    content: `Successful partners should never stop at selling one service. Once they gain confidence with OneEmployee, encourage them to expand their offerings.

Help them introduce AI Automation, Employee Management, Attendance Tracking, WhatsApp Automation, Lead Management, and other solutions that add value to their existing clients.

The more services a partner provides, the stronger their relationship with their customers becomes.

Growth should always be part of every conversation.

Example

An agency initially sells only CRM subscriptions.

During a quarterly review, you suggest introducing AI-powered WhatsApp Automation to their existing clients.

Within a few months, the agency increases its monthly revenue without finding new customers.

Helping partners grow creates success for both businesses.

Implementation

During every review meeting, recommend at least one new service that the partner can confidently introduce to their existing clients.`
  },
  {
    id: 18,
    title: 'Grow Through Referrals and Partnerships',
    readingTime: 2,
    keyTakeaway: 'After every successful milestone, politely ask your partners if they know another agency that could benefit from the White Label Program.',
    content: `One successful agency can introduce many more.

Happy partners often know other agency owners through networking events, business groups, and industry communities. Encourage them to recommend OneEmployee to agencies they trust.

A referral comes with built-in credibility because it is based on a positive experience rather than a sales pitch.

Always appreciate partners who help grow the network.

A strong partner ecosystem is built through trust and recommendations.

Example

A digital marketing agency has been working successfully with OneEmployee for over a year.

They introduce two other agency owners who are looking for additional recurring revenue opportunities.

Those referrals become successful White Label Partners, expanding the network without expensive marketing campaigns.

Implementation

After every successful milestone, politely ask your partners if they know another agency that could benefit from the White Label Program.`
  },
  {
    id: 19,
    title: 'Measure Success with the Right Numbers',
    readingTime: 2,
    keyTakeaway: 'Review every partner\'s performance regularly and use data to guide your support instead of assumptions.',
    content: `Growth should always be measured.

Instead of focusing only on the number of agencies you onboard, track how successful your partners become after joining.

Important metrics include:
• Active White Label Partners
• Monthly Recurring Revenue (MRR)
• New Clients Onboarded
• Client Retention Rate
• Partner Satisfaction
• Upsell Success

These numbers help you understand where additional support is needed and where new opportunities exist.

When partners succeed, these metrics improve naturally.

Example

You notice that one agency has many active clients but very few recurring renewals.

Instead of waiting for cancellations, you schedule a strategy meeting and help them improve customer engagement.

A small improvement increases client retention and recurring income.

Implementation

Review every partner's performance regularly and use data to guide your support instead of assumptions.`
  },
  {
    id: 20,
    title: 'Become a Trusted Growth Partner',
    readingTime: 3,
    keyTakeaway: 'At the end of every partner meeting, ask yourself: "Did I help this agency grow its business today?"',
    content: `The mission of the DMA White Label Sales Team is not simply to recruit agencies.

Your mission is to help agencies build stronger, more profitable businesses.

When your partners succeed, they remain loyal, recommend OneEmployee to others, and continue growing year after year.

Always think beyond today's sale.

Ask yourself how you can help the agency improve its services, retain more clients, increase recurring revenue, and stand out from competitors.

Technology can be copied.

Pricing can change.

But genuine business relationships built on trust and continuous support become your greatest strength.

Example

An agency owner calls to discuss why new client sales have slowed down.

Instead of talking only about the platform, you review their sales process, recommend new marketing ideas, suggest additional service packages, and help them prepare a new sales strategy.

The agency owner leaves the meeting with practical solutions and greater confidence.

They no longer see OneEmployee as a software provider.

They see OneEmployee as a business partner invested in their success.

Implementation

At the end of every partner meeting, ask yourself:
"Did I help this agency grow its business today?"

If the answer is yes, you've achieved the real purpose of the OneEmployee White Label Program—not just creating partners, but building long-term success together.`
  }
];

const buildFullText = () => CHAPTERS.map(ch => `Chapter ${ch.id} — ${ch.title}\n\n${ch.content}\n\nKey Takeaway: ${ch.keyTakeaway}`).join('\n\n' + '─'.repeat(60) + '\n\n');

function ChapterCard({ chapter, isRead, isExpanded, isBookmarked, onToggleExpand, onMarkRead, onToggleBookmark, onPrev, onNext, searchQuery }) {
  const renderContent = (text) => {
    if (!searchQuery.trim()) return text.split('\n').map((line, i, arr) => <span key={i}>{line}{i < arr.length - 1 && <br />}</span>);
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split('\n').map((line, i, arr) => {
      const parts = line.split(regex);
      return <span key={i}>{parts.map((part, j) => regex.test(part) ? <mark key={j} className="bg-yellow-400/30 text-yellow-200 rounded px-0.5">{part}</mark> : part)}{i < arr.length - 1 && <br />}</span>;
    });
  };
  const handlePrint = () => { const w = window.open('','_blank'); w.document.write(`<html><head><title>Ch ${chapter.id}</title><style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;line-height:1.8;}pre{white-space:pre-wrap;font-family:inherit;}</style></head><body><h1>Chapter ${chapter.id} — ${chapter.title}</h1><pre>${chapter.content}</pre><hr/><p><strong>Key Takeaway:</strong> ${chapter.keyTakeaway}</p></body></html>`); w.document.close(); w.print(); };
  const handleDownload = () => { const b = new Blob([`Chapter ${chapter.id} — ${chapter.title}\n\n${chapter.content}\n\nKey Takeaway: ${chapter.keyTakeaway}`], {type:'text/plain'}); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href=u; a.download=`Chapter-${chapter.id}-DMA.txt`; a.click(); URL.revokeObjectURL(u); };

  return (
    <motion.div layout initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className={`rounded-2xl border transition-all duration-200 ${isRead ? 'border-green-500/30 bg-dark-800/80' : 'border-white/10 bg-dark-800'} shadow-lg`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${isRead ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>{isRead ? <CheckCircle2 size={18}/> : chapter.id}</div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white leading-snug">Chapter {chapter.id} — {chapter.title}</h3>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${isRead ? 'bg-green-500/15 text-green-400' : 'bg-dark-600 text-gray-400'}`}>{isRead ? '✓ Read' : 'Unread'}</span>
                <span className="text-[10px] text-orange-400 font-medium">+{XP_PER_CHAPTER} XP</span>
                <span className="text-[10px] text-gray-500 flex items-center gap-1"><Clock size={10}/> {chapter.readingTime} min read</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={onToggleBookmark} className={`p-1.5 rounded-lg transition-colors ${isBookmarked ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}><Bookmark size={14} fill={isBookmarked?'currentColor':'none'}/></button>
            <button onClick={handlePrint} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5"><Printer size={14}/></button>
            <button onClick={handleDownload} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5"><Download size={14}/></button>
            <button onClick={onToggleExpand} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-dark-700 hover:bg-dark-600 text-xs font-medium text-gray-200">{isExpanded?<ChevronUp size={13}/>:<ChevronDown size={13}/>}{isExpanded?'Collapse':'Expand'}</button>
            <button onClick={onMarkRead} disabled={isRead} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isRead?'bg-green-600/20 text-green-400 cursor-default':'bg-orange-500 text-white hover:bg-orange-400'}`}><Check size={13}/>{isRead?'Read':'Mark as Read'}</button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.3}} className="overflow-hidden">
            <div className="px-5 pb-5"><div className="border-t border-white/5 pt-5">
              <h2 className="text-lg font-bold text-white mb-1">Chapter {chapter.id}</h2>
              <h3 className="text-base font-semibold text-orange-400 mb-5">{chapter.title}</h3>
              <div className="text-sm text-gray-300 leading-7 whitespace-pre-wrap font-light">{renderContent(chapter.content)}</div>
              <div className="mt-6 border-t border-white/10 pt-4">
                <div className="flex items-start gap-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <CheckCircle2 size={15} className="text-orange-400 mt-0.5 flex-shrink-0"/>
                  <div><p className="text-[10px] font-semibold uppercase tracking-widest text-orange-400 mb-1">Key Takeaway</p><p className="text-sm text-gray-200 italic">{chapter.keyTakeaway}</p></div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <button onClick={onPrev} disabled={chapter.id===1} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-dark-700 hover:bg-dark-600 text-xs text-gray-300 disabled:opacity-30"><ArrowLeft size={13}/> Previous</button>
                <span className="text-[10px] text-gray-500">{chapter.id}/{TOTAL_CHAPTERS}</span>
                <button onClick={onNext} disabled={chapter.id===TOTAL_CHAPTERS} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-dark-700 hover:bg-dark-600 text-xs text-gray-300 disabled:opacity-30">Next <ArrowRight size={13}/></button>
              </div>
            </div></div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function PlaybookDMA() {
  const [readIds, setReadIds] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const chapterRefs = useRef({});

  useEffect(() => { (async()=>{ try { const r=await api.get('/playbook/dma-progress'); setReadIds(r.data.map(c=>parseInt(c.chapterId.replace('dma-ch-','')))); } catch { try{setReadIds(JSON.parse(localStorage.getItem('dma-playbook-read')||'[]'));}catch{} } try{setBookmarkedIds(JSON.parse(localStorage.getItem('dma-playbook-bookmarks')||'[]'));}catch{} setLoading(false); })(); }, []);

  useEffect(() => { const h=(e)=>{if(!e.ctrlKey)return;if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;e.preventDefault();const ids=filteredChapters.map(c=>c.id);if(expandedIds.length===0){if(ids.length>0)toggleExpand(ids[0]);return;}const last=expandedIds[expandedIds.length-1];const idx=ids.indexOf(last);if(e.key==='ArrowRight'&&idx<ids.length-1){toggleExpand(ids[idx+1]);scrollTo(ids[idx+1]);}else if(e.key==='ArrowLeft'&&idx>0){toggleExpand(ids[idx-1]);scrollTo(ids[idx-1]);}}; window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h); }, [expandedIds]);

  const scrollTo=(id)=>setTimeout(()=>chapterRefs.current[id]?.scrollIntoView({behavior:'smooth',block:'start'}),100);
  const toggleExpand=useCallback((id)=>setExpandedIds(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]),[]);

  const markRead=async(id)=>{if(readIds.includes(id))return;const n=[...readIds,id];setReadIds(n);localStorage.setItem('dma-playbook-read',JSON.stringify(n));try{await api.post(`/playbook/dma-complete/${id}`);window.dispatchEvent(new CustomEvent('xp:update',{detail:{xpGain:XP_PER_CHAPTER}}));}catch{}toast.success(`+${XP_PER_CHAPTER} XP — Chapter ${id} completed!`);if(id<TOTAL_CHAPTERS){const nxt=id+1;setExpandedIds(p=>p.includes(nxt)?p:[...p,nxt]);scrollTo(nxt);}};

  const toggleBookmark=(id)=>{const n=bookmarkedIds.includes(id)?bookmarkedIds.filter(x=>x!==id):[...bookmarkedIds,id];setBookmarkedIds(n);localStorage.setItem('dma-playbook-bookmarks',JSON.stringify(n));toast.success(bookmarkedIds.includes(id)?'Bookmark removed':'Chapter bookmarked');};

  const copyPlaybook=async()=>{try{await navigator.clipboard.writeText(buildFullText());setCopied(true);toast.success('Full playbook copied');setTimeout(()=>setCopied(false),2500);}catch{toast.error('Copy failed');}};

  const filteredChapters=CHAPTERS.filter(ch=>{if(!search.trim())return true;const q=search.toLowerCase();return ch.title.toLowerCase().includes(q)||ch.content.toLowerCase().includes(q)||ch.keyTakeaway.toLowerCase().includes(q)||`chapter ${ch.id}`.includes(q);});
  const completedCount=readIds.length;const earnedXp=completedCount*XP_PER_CHAPTER;const progress=Math.round((completedCount/TOTAL_CHAPTERS)*100);const allDone=completedCount===TOTAL_CHAPTERS;

  if(loading)return<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="glass-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><BookOpen size={18} className="text-orange-400"/><span className="text-[10px] font-semibold uppercase tracking-widest text-orange-400">DMA White Label Sales Team</span></div>
            <h1 className="text-xl font-bold text-white">White Label Playbook</h1>
            <p className="text-sm text-gray-400 mt-1">Complete learning guide for DMA White Label Sales Team.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-center px-3 py-2 rounded-xl bg-dark-700 border border-white/5"><p className="text-xs font-bold text-white">{completedCount}/{TOTAL_CHAPTERS}</p><p className="text-[10px] text-gray-500">Chapters Read</p></div>
            <div className="text-center px-3 py-2 rounded-xl bg-dark-700 border border-white/5"><p className="text-xs font-bold text-orange-400">{earnedXp} XP</p><p className="text-[10px] text-gray-500">XP Earned</p></div>
            <button onClick={copyPlaybook} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold transition-colors">{copied?<Check size={14}/>:<Copy size={14}/>}{copied?'Copied!':'Copy Full Playbook'}</button>
          </div>
        </div>
        <div className="mt-4"><div className="flex items-center justify-between mb-1.5"><span className="text-[11px] text-gray-400">Progress</span><span className="text-[11px] text-gray-400">{progress}%</span></div><div className="h-2 bg-dark-600 rounded-full overflow-hidden"><motion.div initial={{width:0}} animate={{width:`${progress}%`}} transition={{duration:0.6}} className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500"/></div><p className="text-[10px] text-gray-500 mt-1.5">Ctrl+→ / Ctrl+← to navigate • {TOTAL_XP-earnedXp} XP remaining</p></div>
      </div>

      <AnimatePresence>{allDone&&(<motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} className="glass-card p-6 border border-orange-500/30 bg-orange-500/5 text-center"><Trophy size={36} className="text-orange-400 mx-auto mb-2"/><h2 className="text-lg font-bold text-white">🎉 Congratulations!</h2><p className="text-sm text-gray-300 mt-1">White Label Playbook Completed</p><p className="text-orange-400 font-bold mt-2">{TOTAL_XP} XP Earned</p></motion.div>)}</AnimatePresence>

      <div className="relative"><Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"/><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search chapters..." className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"/>{search&&<button onClick={()=>setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"><X size={14}/></button>}</div>
      {search&&<p className="text-xs text-gray-500 -mt-4">{filteredChapters.length} chapter{filteredChapters.length!==1?'s':''} found</p>}

      <div className="space-y-3">
        {filteredChapters.length===0?<div className="text-center py-12 text-gray-500 text-sm">No chapters match.</div>:filteredChapters.map(ch=>(
          <div key={ch.id} ref={el=>chapterRefs.current[ch.id]=el}>
            <ChapterCard chapter={ch} isRead={readIds.includes(ch.id)} isExpanded={expandedIds.includes(ch.id)} isBookmarked={bookmarkedIds.includes(ch.id)} onToggleExpand={()=>toggleExpand(ch.id)} onMarkRead={()=>markRead(ch.id)} onToggleBookmark={()=>toggleBookmark(ch.id)} searchQuery={search} onPrev={()=>{if(ch.id>1){toggleExpand(ch.id-1);scrollTo(ch.id-1);}}} onNext={()=>{if(ch.id<TOTAL_CHAPTERS){toggleExpand(ch.id+1);scrollTo(ch.id+1);}}}/>
          </div>
        ))}
      </div>

      {bookmarkedIds.length>0&&!search&&(<div className="glass-card p-5"><h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Bookmark size={14} className="text-yellow-400"/> Bookmarked</h3><div className="flex flex-wrap gap-2">{bookmarkedIds.sort((a,b)=>a-b).map(id=>{const ch=CHAPTERS.find(c=>c.id===id);return ch?<button key={id} onClick={()=>{toggleExpand(id);scrollTo(id);}} className="px-3 py-1.5 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 text-xs hover:bg-yellow-400/20">Ch. {id} — {ch.title.length>25?ch.title.slice(0,25)+'…':ch.title}</button>:null;})}</div></div>)}
    </div>
  );
}
