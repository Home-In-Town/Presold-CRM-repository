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
    title: 'Content Has One Job – Build Trust',
    readingTime: 2,
    keyTakeaway: 'Before publishing any content, ask: "Does this build trust or only attract attention?" Trust always wins.',
    content: `Many content creators believe their job is to get likes, views, and followers. While these numbers feel good, they don't always help the business grow.

For OneEmployee, every piece of content should have one purpose: build trust and move potential customers one step closer to becoming clients.

A video with 500 views that generates three qualified enquiries is far more valuable than a video with 100,000 views and no business impact.

Before creating any content, ask yourself,
"Will this help someone trust our company more?"

If the answer is yes, create it.

If not, rethink the idea.

Content should educate, solve problems, answer questions, and show real results.

When people trust your brand, sales become much easier.

Example

Instead of posting,
"Our CRM is the best."

Create a short video showing how a builder reduced missed follow-ups using OneEmployee.

The audience believes real results more than marketing claims.

Implementation

Before publishing any content, ask:
"Does this build trust or only attract attention?"

Trust always wins.`
  },
  {
    id: 2,
    title: 'Understand Your Audience Before Creating Content',
    readingTime: 2,
    keyTakeaway: 'Before creating content, clearly define who the audience is and what problem you\'re solving for them.',
    content: `Great content begins with understanding who will watch it.

Builders, sales managers, digital marketing agencies, and business owners all have different problems.

If you create one video for everyone, nobody feels like you're speaking directly to them.

Understand what keeps your audience awake at night.

Are they losing leads?

Are they struggling with follow-ups?

Do they want more bookings?

Create content that answers those questions.

When your audience feels understood, they naturally pay attention.

Example

Instead of making a generic CRM video,
Create one titled,
"Why Builders Lose 30% of Their Leads Without Even Realizing It."

A builder immediately feels the content is relevant.

Relevance creates engagement.

Implementation

Before creating content, clearly define who the audience is and what problem you're solving for them.`
  },
  {
    id: 3,
    title: 'Every Great Video Starts with a Strong Hook',
    readingTime: 2,
    keyTakeaway: 'Spend as much time writing the first sentence as you do creating the entire video. The hook decides whether the rest of your content gets seen.',
    content: `The first three seconds decide whether someone watches your content or keeps scrolling.

If your opening line is boring, even great information later won't matter.

A good hook creates curiosity, highlights a problem, or surprises the audience.

Don't start with,
"Hi everyone, welcome back..."
Start with something that makes people stop.

Your hook should answer one question:
"Why should someone continue watching?"

Example

Instead of saying,
"Today we'll talk about CRM."

Say,
"Builders lose lakhs of rupees every month because of one simple mistake. Here's how to avoid it."

The second version immediately creates curiosity.

People stop scrolling because they want the answer.

Implementation

Spend as much time writing the first sentence as you do creating the entire video.

The hook decides whether the rest of your content gets seen.`
  },
  {
    id: 4,
    title: 'Tell Stories, Don\'t Sell Products',
    readingTime: 2,
    keyTakeaway: 'Every content piece should answer three questions: Who had the problem? What changed? What was the result?',
    content: `People remember stories.

They forget sales pitches.

Instead of talking about features, tell stories about real businesses, real challenges, and real results.

Stories help people imagine themselves using your product.

When customers connect emotionally with your content, they remember your brand longer.

Good storytelling turns information into inspiration.

Example

Instead of saying,
"Our CRM has WhatsApp Automation."

Tell the story of a builder who missed leads after office hours and later increased response speed by using automated replies.

The audience sees the problem and the solution naturally.

Stories educate without sounding like advertisements.

Implementation

Every content piece should answer three questions:
Who had the problem?
What changed?
What was the result?`
  },
  {
    id: 5,
    title: 'Create Content That Solves Problems',
    readingTime: 2,
    keyTakeaway: 'Create a list of the top 50 customer questions and turn each one into a piece of content.',
    content: `People search for solutions, not advertisements.

The best content teaches something useful before asking for anything in return.

Think about the questions your sales team hears every day.

Turn those questions into videos, reels, blogs, and carousels.

When your marketing answers customer questions before the sales call, your sales team spends less time explaining and more time closing deals.

Educational content works for your business even while you sleep.

Example

Sales executives frequently hear,
"Why should I use CRM when Excel works fine?"

Instead of answering individually every day, create a simple two-minute video comparing Excel and CRM with real business examples.

Now every future customer can understand the difference before speaking with sales.

Implementation

Create a list of the top 50 customer questions and turn each one into a piece of content.

The best content creators don't guess what to post.

They answer the questions customers are already asking.`
  },
  {
    id: 6,
    title: 'Show Real Results, Not Just Features',
    readingTime: 2,
    keyTakeaway: 'Whenever possible, create content using customer success stories, before-and-after comparisons, and measurable results.',
    content: `People trust results more than promises.

Anyone can say their product is fast, smart, or powerful. But customers believe what they can see. Instead of talking about features, show how those features helped a real business solve a real problem.

Your content should answer one simple question:
"What changed after using our product?"

When people see actual improvements, they begin trusting the brand without being convinced.

Example

Instead of creating a reel saying,
"OneEmployee has AI-powered WhatsApp Automation."

Create a video showing,
"A builder was missing enquiries after office hours. After using OneEmployee, every enquiry received an instant reply, increasing customer response and reducing missed opportunities."

The audience remembers the result, not the feature.

Implementation

Whenever possible, create content using customer success stories, before-and-after comparisons, and measurable results.`
  },
  {
    id: 7,
    title: 'Make Every Reel Easy to Understand',
    readingTime: 2,
    keyTakeaway: 'Before creating a video, write the main message in one sentence. If you can\'t explain it simply, simplify the content first.',
    content: `The biggest mistake content creators make is trying to explain too much in one video.

If viewers need to watch a reel twice just to understand the message, you've already lost their attention.

One reel should focus on one idea, one problem, and one solution.

Simple content performs better because people can understand it quickly and share it with others.

Remember, clarity always beats complexity.

Example

Instead of making a 60-second reel explaining ten CRM features, create a 30-second reel answering one question:
"Why do builders lose leads after office hours?"

End the reel by showing how OneEmployee solves that single problem.

The message becomes much stronger.

Implementation

Before creating a video, write the main message in one sentence.

If you can't explain it simply, simplify the content first.`
  },
  {
    id: 8,
    title: 'Create Content Consistently',
    readingTime: 2,
    keyTakeaway: 'Create a monthly content calendar and follow it with discipline. Consistency is more important than perfection.',
    content: `One viral video cannot build a brand.

Customers trust businesses they see regularly.

Posting consistently keeps your company active in the minds of potential clients. Even if someone doesn't need your service today, they are more likely to remember you when they need it in the future.

Consistency also helps you understand what type of content your audience enjoys the most.

Success comes from publishing regularly, learning from the results, and improving over time.

Example

A company uploads one high-quality video every day for three months.

Some videos perform well.

Others don't.

But together they build trust, increase followers, generate enquiries, and improve brand recognition.

The company that stays consistent always has more opportunities than the one that posts only occasionally.

Implementation

Create a monthly content calendar and follow it with discipline.

Consistency is more important than perfection.`
  },
  {
    id: 9,
    title: 'Learn from Your Content Performance',
    readingTime: 2,
    keyTakeaway: 'Review your content performance every week and identify patterns instead of relying on assumptions.',
    content: `Creating content is only half the job.

The other half is understanding what worked and what didn't.

Every video provides valuable information through views, watch time, shares, saves, comments, and enquiries.

Don't measure success only by views.

Ask deeper questions.

Which videos generated enquiries?

Which topics kept viewers watching?

Which hooks made people stop scrolling?

The answers will help you create better content in the future.

Great creators don't guess.

They learn from data.

Example

Two reels receive 10,000 views each.

The first generates no enquiries.

The second brings five demo requests.

Although both received the same views, the second reel created business value.

That's the content you should create more often.

Implementation

Review your content performance every week and identify patterns instead of relying on assumptions.`
  },
  {
    id: 10,
    title: 'Work Together with the Sales Team',
    readingTime: 2,
    keyTakeaway: 'Schedule one meeting every week between the content team and the sales team to collect real customer questions and convert them into valuable content ideas.',
    content: `The content team and the sales team should never work separately.

Sales executives speak with customers every day. They know the most common questions, objections, and challenges.

Those conversations are valuable ideas for future content.

Meet the sales team regularly and ask,
• What questions do customers ask most?
• Which objections appear repeatedly?
• Which topics confuse potential clients?

Turn those answers into videos, blogs, reels, and social media posts.

When content answers customer questions before the sales call, sales become easier.

Marketing attracts attention.

Sales convert attention into business.

Together they create growth.

Example

The sales team notices that many builders ask,
"Can OneEmployee integrate with WhatsApp?"

Instead of answering the same question individually every day, the content team creates a short explainer video demonstrating the integration.

Future customers receive the answer before contacting sales.

This saves time and builds confidence.

Implementation

Schedule one meeting every week between the content team and the sales team to collect real customer questions and convert them into valuable content ideas.`
  },
  {
    id: 11,
    title: 'Repurpose One Idea into Multiple Content Pieces',
    readingTime: 2,
    keyTakeaway: 'Before creating new content, ask yourself: "How many different formats can I create from this one idea?"',
    content: `Creating fresh content every day can feel difficult. Many content creators think they need a new idea for every post, but that's not true.

One good idea can become many pieces of content.

A webinar can become a YouTube video, several Instagram Reels, LinkedIn posts, carousel posts, blog articles, email newsletters, and WhatsApp updates. This saves time, keeps your messaging consistent, and helps you reach different audiences on different platforms.

Smart creators don't work harder.

They make every piece of content work harder.

Example

Your team records a 20-minute webinar on "How Builders Lose Leads."

From that one webinar, you create:
• 5 Instagram Reels
• 2 LinkedIn posts
• 1 Blog Article
• 1 Email Newsletter
• 3 WhatsApp tips

Instead of creating one piece of content, you create twelve.

Implementation

Before creating new content, ask yourself:
"How many different formats can I create from this one idea?"`
  },
  {
    id: 12,
    title: 'Build a Strong Personal Brand for the Founder',
    readingTime: 2,
    keyTakeaway: 'Plan at least one founder-led content piece every week to strengthen the company\'s authority.',
    content: `People connect with people before they connect with companies.

A founder who shares knowledge, experiences, and insights builds more trust than a company logo ever can.

Encourage your founders, directors, or business leaders to become the face of the brand. Their opinions, success stories, and industry knowledge help build credibility.

Customers prefer learning from experts rather than advertisements.

A trusted founder automatically builds a trusted company.

Example

Instead of posting,
"OneEmployee launches a new feature."

Create a video where the founder explains,
"Why builders lose sales because of slow follow-ups and how technology can solve this problem."

The message feels more authentic and relatable.

Implementation

Plan at least one founder-led content piece every week to strengthen the company's authority.`
  },
  {
    id: 13,
    title: 'Create Content That Starts Conversations',
    readingTime: 2,
    keyTakeaway: 'Every content piece should encourage at least one meaningful interaction from the audience.',
    content: `Good content gets views.

Great content gets conversations.

Your goal should not only be to inform people but also to encourage them to interact with your brand.

Ask questions.

Invite opinions.

Encourage people to share their experiences.

When audiences participate, social media platforms naturally show your content to more people.

Engagement builds community.

Community builds trust.

Trust builds business.

Example

Instead of ending a reel with,
"Follow us for more."

End with,
"What's the biggest challenge your sales team faces today? Tell us in the comments."

People are much more likely to respond when you invite them into the conversation.

Implementation

Every content piece should encourage at least one meaningful interaction from the audience.`
  },
  {
    id: 14,
    title: 'Stay Updated with Industry Trends',
    readingTime: 2,
    keyTakeaway: 'Spend time every week studying successful creators and identify new ideas that can improve your own content.',
    content: `Content creators who follow the same style every year slowly become irrelevant.

Markets change.

Technology evolves.

Social media trends shift.

Customer expectations grow.

The best creators continuously observe new content formats, platform updates, AI tools, and industry developments.

Learning doesn't mean copying trends.

It means adapting successful ideas to fit your audience and brand.

Fresh content keeps your company visible and competitive.

Example

Short-form educational videos become more popular among business owners.

Instead of continuing with long promotional videos, your team begins creating 30-second educational reels explaining common sales and marketing problems.

Audience engagement increases because the content matches current viewing habits.

Implementation

Spend time every week studying successful creators and identify new ideas that can improve your own content.`
  },
  {
    id: 15,
    title: 'Create Content That Supports Business Goals',
    readingTime: 3,
    keyTakeaway: 'Before starting any content, ask: "How does this content help OneEmployee achieve its business goals?"',
    content: `The purpose of content is not simply to fill a social media calendar.

Every post should contribute to a business objective.

Some content builds awareness.

Some generates enquiries.

Some builds trust.

Some helps the sales team answer objections.

Before creating anything, decide exactly what you want the audience to do after consuming the content.

Without a clear objective, even good content may not produce business results.

Content should always support the company's growth strategy.

Example

Your goal this month is to increase demo bookings.

Instead of creating random motivational posts, your team publishes customer success stories, CRM walkthroughs, educational reels, and case studies that encourage viewers to book a demo.

Every piece of content supports the same business objective.

The result is more qualified enquiries instead of just more views.

Implementation

Before starting any content, ask one simple question:
"How does this content help OneEmployee achieve its business goals?"

If the answer is clear, create it.

If not, rethink the idea before investing time and effort.`
  },
  {
    id: 16,
    title: 'Build a Content Calendar That Works',
    readingTime: 2,
    keyTakeaway: 'Create a monthly content calendar and review it every week to ensure every post supports the company\'s marketing goals.',
    content: `One of the biggest mistakes content teams make is creating content without a plan. They decide what to post at the last minute, which often leads to inconsistent quality and missed opportunities.

A content calendar helps your team stay organized. It ensures that every week includes a healthy mix of educational content, customer success stories, product updates, industry insights, and promotional posts.

Planning content in advance also gives the team enough time to research, write, design, review, and publish high-quality content.

Great content is rarely created in a hurry.

Example

Instead of deciding today's post this morning, the team prepares an entire month's content in advance.

Monday – Educational Reel
Tuesday – Customer Success Story
Wednesday – Product Feature
Thursday – Industry Tip
Friday – Founder Video

This keeps the brand active and consistent.

Implementation

Create a monthly content calendar and review it every week to ensure every post supports the company's marketing goals.`
  },
  {
    id: 17,
    title: 'AI Is Your Assistant, Not Your Replacement',
    readingTime: 2,
    keyTakeaway: 'Use AI to increase productivity, but always add your own creativity before publishing.',
    content: `Artificial Intelligence has changed the way content is created. It can help generate ideas, write captions, create scripts, suggest headlines, and improve productivity.

However, AI cannot replace creativity, human experience, or emotional storytelling.

Use AI to save time, but always review and improve the final content before publishing. The best content still reflects your brand's voice, values, and personality.

Remember, AI creates drafts.

Humans create trust.

Example

A content writer uses AI to generate five hook ideas for a reel.

Instead of copying them directly, they choose the best one, rewrite it in OneEmployee's brand voice, and add a real customer example.

The final content feels authentic and professional.

Implementation

Use AI to increase productivity, but always add your own creativity before publishing.`
  },
  {
    id: 18,
    title: 'Maintain a Consistent Brand Voice',
    readingTime: 2,
    keyTakeaway: 'Create simple brand guidelines covering tone, language, colours, fonts, and messaging so every content creator follows the same style.',
    content: `Every piece of content represents the company.

If one post sounds formal, another sounds funny, and another sounds completely different, people become confused about the brand.

A consistent brand voice builds recognition and trust.

Whether you're creating a reel, blog, email, or LinkedIn post, the tone should remain professional, helpful, and easy to understand.

Customers should immediately recognize that the content belongs to OneEmployee.

Consistency makes brands memorable.

Example

One team member writes,
"Buy our CRM today!"

Another writes,
"Let's help your business grow with smarter lead management."

The second message feels more helpful and matches the company's professional image.

Over time, this consistency strengthens the brand.

Implementation

Create simple brand guidelines covering tone, language, colours, fonts, and messaging so every content creator follows the same style.`
  },
  {
    id: 19,
    title: 'Learn from Feedback and Keep Improving',
    readingTime: 2,
    keyTakeaway: 'Review comments and customer feedback every week and turn the most common requests into your next content ideas.',
    content: `No content creator gets everything right every time.

Some posts perform well.

Some don't.

Instead of becoming discouraged, treat every result as feedback.

Read comments.

Listen to the sales team.

Ask customers what they found useful.

Every opinion helps you create stronger content in the future.

The best creators are always learning.

Improvement happens when you accept feedback with an open mind.

Example

A reel receives many comments asking,
"Can you show how this feature actually works?"

Instead of ignoring the feedback, the content team creates a step-by-step product demonstration video the following week.

The audience appreciates that their suggestions were heard.

Feedback becomes better content.

Implementation

Review comments and customer feedback every week and turn the most common requests into your next content ideas.`
  },
  {
    id: 20,
    title: 'Create Content That Creates Business Growth',
    readingTime: 3,
    keyTakeaway: 'Before publishing any content, ask: "Will this content help someone trust OneEmployee and take the next step toward becoming our customer?"',
    content: `The success of a content creator should never be measured only by views or followers.

Real success is measured by the business impact your content creates.

Did it generate enquiries?

Did it build trust?

Did it help the sales team?

Did it educate potential customers?

Every piece of content should move someone one step closer to becoming a customer.

When content helps people solve problems, understand the product, and trust the company, sales become much easier.

Content is not just marketing.

It is one of the strongest tools for business growth.

Example

A 40-second educational reel explaining how builders lose leads because of slow follow-ups receives only 8,000 views.

However, five builders book product demos after watching it.

Another reel receives 100,000 views but generates no enquiries.

The first reel created business value.

That is the content worth creating again.

Implementation

Before publishing any content, ask yourself one final question:
"Will this content help someone trust OneEmployee and take the next step toward becoming our customer?"

If the answer is yes, publish it with confidence.

Because great content doesn't just attract attention.

Great content grows businesses.`
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
  const handleDownload = () => { const b = new Blob([`Chapter ${chapter.id} — ${chapter.title}\n\n${chapter.content}\n\nKey Takeaway: ${chapter.keyTakeaway}`], {type:'text/plain'}); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href=u; a.download=`Chapter-${chapter.id}-Content.txt`; a.click(); URL.revokeObjectURL(u); };

  return (
    <motion.div layout initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className={`rounded-2xl border transition-all duration-200 ${isRead ? 'border-green-500/30 bg-dark-800/80' : 'border-white/10 bg-dark-800'} shadow-lg`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${isRead ? 'bg-green-500/20 text-green-400' : 'bg-pink-500/20 text-pink-400'}`}>{isRead ? <CheckCircle2 size={18}/> : chapter.id}</div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white leading-snug">Chapter {chapter.id} — {chapter.title}</h3>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${isRead ? 'bg-green-500/15 text-green-400' : 'bg-dark-600 text-gray-400'}`}>{isRead ? '✓ Read' : 'Unread'}</span>
                <span className="text-[10px] text-pink-400 font-medium">+{XP_PER_CHAPTER} XP</span>
                <span className="text-[10px] text-gray-500 flex items-center gap-1"><Clock size={10}/> {chapter.readingTime} min read</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={onToggleBookmark} className={`p-1.5 rounded-lg transition-colors ${isBookmarked ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}><Bookmark size={14} fill={isBookmarked?'currentColor':'none'}/></button>
            <button onClick={handlePrint} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5"><Printer size={14}/></button>
            <button onClick={handleDownload} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5"><Download size={14}/></button>
            <button onClick={onToggleExpand} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-dark-700 hover:bg-dark-600 text-xs font-medium text-gray-200">{isExpanded?<ChevronUp size={13}/>:<ChevronDown size={13}/>}{isExpanded?'Collapse':'Expand'}</button>
            <button onClick={onMarkRead} disabled={isRead} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isRead?'bg-green-600/20 text-green-400 cursor-default':'bg-pink-500 text-white hover:bg-pink-400'}`}><Check size={13}/>{isRead?'Read':'Mark as Read'}</button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.3}} className="overflow-hidden">
            <div className="px-5 pb-5"><div className="border-t border-white/5 pt-5">
              <h2 className="text-lg font-bold text-white mb-1">Chapter {chapter.id}</h2>
              <h3 className="text-base font-semibold text-pink-400 mb-5">{chapter.title}</h3>
              <div className="text-sm text-gray-300 leading-7 whitespace-pre-wrap font-light">{renderContent(chapter.content)}</div>
              <div className="mt-6 border-t border-white/10 pt-4">
                <div className="flex items-start gap-2 p-3 rounded-xl bg-pink-500/10 border border-pink-500/20">
                  <CheckCircle2 size={15} className="text-pink-400 mt-0.5 flex-shrink-0"/>
                  <div><p className="text-[10px] font-semibold uppercase tracking-widest text-pink-400 mb-1">Key Takeaway</p><p className="text-sm text-gray-200 italic">{chapter.keyTakeaway}</p></div>
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

export default function PlaybookContent() {
  const [readIds, setReadIds] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const chapterRefs = useRef({});

  useEffect(() => { (async()=>{ try { const r=await api.get('/playbook/content-progress'); setReadIds(r.data.map(c=>parseInt(c.chapterId.replace('content-ch-','')))); } catch { try{setReadIds(JSON.parse(localStorage.getItem('content-playbook-read')||'[]'));}catch{} } try{setBookmarkedIds(JSON.parse(localStorage.getItem('content-playbook-bookmarks')||'[]'));}catch{} setLoading(false); })(); }, []);

  useEffect(() => { const h=(e)=>{if(!e.ctrlKey)return;if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;e.preventDefault();const ids=filteredChapters.map(c=>c.id);if(expandedIds.length===0){if(ids.length>0)toggleExpand(ids[0]);return;}const last=expandedIds[expandedIds.length-1];const idx=ids.indexOf(last);if(e.key==='ArrowRight'&&idx<ids.length-1){toggleExpand(ids[idx+1]);scrollTo(ids[idx+1]);}else if(e.key==='ArrowLeft'&&idx>0){toggleExpand(ids[idx-1]);scrollTo(ids[idx-1]);}}; window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h); }, [expandedIds]);

  const scrollTo=(id)=>setTimeout(()=>chapterRefs.current[id]?.scrollIntoView({behavior:'smooth',block:'start'}),100);
  const toggleExpand=useCallback((id)=>setExpandedIds(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]),[]);

  const markRead=async(id)=>{if(readIds.includes(id))return;const n=[...readIds,id];setReadIds(n);localStorage.setItem('content-playbook-read',JSON.stringify(n));try{await api.post(`/playbook/content-complete/${id}`);window.dispatchEvent(new CustomEvent('xp:update',{detail:{xpGain:XP_PER_CHAPTER}}));}catch{}toast.success(`+${XP_PER_CHAPTER} XP — Chapter ${id} completed!`);if(id<TOTAL_CHAPTERS){const nxt=id+1;setExpandedIds(p=>p.includes(nxt)?p:[...p,nxt]);scrollTo(nxt);}};

  const toggleBookmark=(id)=>{const n=bookmarkedIds.includes(id)?bookmarkedIds.filter(x=>x!==id):[...bookmarkedIds,id];setBookmarkedIds(n);localStorage.setItem('content-playbook-bookmarks',JSON.stringify(n));toast.success(bookmarkedIds.includes(id)?'Bookmark removed':'Chapter bookmarked');};

  const copyPlaybook=async()=>{try{await navigator.clipboard.writeText(buildFullText());setCopied(true);toast.success('Full playbook copied');setTimeout(()=>setCopied(false),2500);}catch{toast.error('Copy failed');}};

  const filteredChapters=CHAPTERS.filter(ch=>{if(!search.trim())return true;const q=search.toLowerCase();return ch.title.toLowerCase().includes(q)||ch.content.toLowerCase().includes(q)||ch.keyTakeaway.toLowerCase().includes(q)||`chapter ${ch.id}`.includes(q);});
  const completedCount=readIds.length;const earnedXp=completedCount*XP_PER_CHAPTER;const progress=Math.round((completedCount/TOTAL_CHAPTERS)*100);const allDone=completedCount===TOTAL_CHAPTERS;

  if(loading)return<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="glass-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><BookOpen size={18} className="text-pink-400"/><span className="text-[10px] font-semibold uppercase tracking-widest text-pink-400">Content Creation Team</span></div>
            <h1 className="text-xl font-bold text-white">Content Creator Playbook</h1>
            <p className="text-sm text-gray-400 mt-1">Complete learning guide for Content Creation Team.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-center px-3 py-2 rounded-xl bg-dark-700 border border-white/5"><p className="text-xs font-bold text-white">{completedCount}/{TOTAL_CHAPTERS}</p><p className="text-[10px] text-gray-500">Chapters Read</p></div>
            <div className="text-center px-3 py-2 rounded-xl bg-dark-700 border border-white/5"><p className="text-xs font-bold text-pink-400">{earnedXp} XP</p><p className="text-[10px] text-gray-500">XP Earned</p></div>
            <button onClick={copyPlaybook} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-white text-xs font-semibold transition-colors">{copied?<Check size={14}/>:<Copy size={14}/>}{copied?'Copied!':'Copy Full Playbook'}</button>
          </div>
        </div>
        <div className="mt-4"><div className="flex items-center justify-between mb-1.5"><span className="text-[11px] text-gray-400">Progress</span><span className="text-[11px] text-gray-400">{progress}%</span></div><div className="h-2 bg-dark-600 rounded-full overflow-hidden"><motion.div initial={{width:0}} animate={{width:`${progress}%`}} transition={{duration:0.6}} className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-500"/></div><p className="text-[10px] text-gray-500 mt-1.5">Ctrl+→ / Ctrl+← to navigate • {TOTAL_XP-earnedXp} XP remaining</p></div>
      </div>

      <AnimatePresence>{allDone&&(<motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} className="glass-card p-6 border border-pink-500/30 bg-pink-500/5 text-center"><Trophy size={36} className="text-pink-400 mx-auto mb-2"/><h2 className="text-lg font-bold text-white">🎉 Congratulations!</h2><p className="text-sm text-gray-300 mt-1">Content Creator Playbook Completed</p><p className="text-pink-400 font-bold mt-2">{TOTAL_XP} XP Earned</p></motion.div>)}</AnimatePresence>

      <div className="relative"><Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"/><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search chapters..." className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"/>{search&&<button onClick={()=>setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"><X size={14}/></button>}</div>
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
