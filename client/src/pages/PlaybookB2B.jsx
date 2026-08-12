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
    title: 'Understand Your Customer\'s Business Before Selling',
    readingTime: 2,
    keyTakeaway: 'Never contact a builder without first researching their company, projects, and online presence.',
    content: `A great B2B salesperson doesn't start by talking about their product. They start by understanding the customer's business.

Before contacting a builder or developer, spend a few minutes learning about their company. Visit their website, check their social media pages, look at their ongoing projects, and understand who they are trying to sell to. This small effort will completely change the quality of your conversation.

Builders don't want another salesperson who reads a script. They want someone who understands their challenges.

Instead of saying,
"We provide CRM software."

Say,
"I noticed your company is launching two new projects this quarter. I'm curious, how are you currently managing enquiries from Meta Ads and WhatsApp?"

This simple difference immediately creates a meaningful conversation.

Example

A salesperson spends ten minutes researching a builder before calling. During the conversation, they mention the builder's latest project and congratulate them on its launch.

The builder realizes this isn't just another cold call and becomes more willing to continue the discussion.

Implementation

Never contact a builder without first researching their company, projects, and online presence.`
  },
  {
    id: 2,
    title: 'Finding the Right Decision Maker',
    readingTime: 2,
    keyTakeaway: 'Always identify the decision maker before presenting PreSold CRM.',
    content: `Many salespeople spend weeks talking to people who cannot make buying decisions.

Your goal is to identify the person responsible for sales, marketing, or business growth. This could be the Managing Director, Sales Head, Marketing Manager, or CRM Manager.

Talking to the wrong person wastes everyone's time.

Example

Instead of explaining the product to a receptionist, politely ask,
"May I speak with the person who handles your sales operations or customer management?"

One good introduction can save weeks of unnecessary follow-up.

Implementation

Always identify the decision maker before presenting PreSold CRM.`
  },
  {
    id: 3,
    title: 'Make Your First Call About Them, Not You',
    readingTime: 2,
    keyTakeaway: 'Spend more time listening than speaking during your first interaction.',
    content: `Most cold calls fail because salespeople spend the first two minutes talking about their company.

Customers don't care about your company until they believe you understand their problem.

Begin every conversation by asking thoughtful questions.

Example

Instead of saying,
"I'm calling from PreSold CRM."

Say,
"I'd love to understand how your team currently manages leads coming from Facebook, Google, and WhatsApp."

Questions create conversations.

Presentations create resistance.

Implementation

Spend more time listening than speaking during your first interaction.`
  },
  {
    id: 4,
    title: 'Discover Problems Before Presenting Solutions',
    readingTime: 2,
    keyTakeaway: 'Follow the 80/20 rule. Listen for 80% of the conversation. Speak for 20%.',
    content: `Never assume every builder has the same challenges.

Some struggle with lead management.
Others struggle with follow-ups.
Some need better reporting.
Others want AI automation.

Your job is to discover the problem before explaining the solution.

Example

Ask,
"What is the biggest challenge your sales team faces today?"

Listen carefully.

Only then explain how PreSold solves that specific challenge.

Implementation

Follow the 80/20 rule.

Listen for 80% of the conversation.

Speak for 20%.`
  },
  {
    id: 5,
    title: 'Present Value, Not Features',
    readingTime: 2,
    keyTakeaway: 'Convert every feature into a business benefit before presenting it.',
    content: `Customers rarely buy software because it has many features.

They buy because it solves expensive problems.

Instead of listing every feature, explain how each one improves the builder's business.

Example

Instead of saying,
"Our CRM has AI WhatsApp automation."

Say,
"Your team can reply to every enquiry instantly, even after office hours, so you never lose interested buyers."

Customers buy outcomes.

Not buttons.

Implementation

Convert every feature into a business benefit before presenting it.`
  },
];

const CHAPTERS_PART2 = [
  {
    id: 6,
    title: 'Deliver a Demo That Solves Problems, Not Just Shows Features',
    readingTime: 3,
    keyTakeaway: 'Before every demo, write down the customer\'s top three challenges and ensure your presentation focuses on solving those first.',
    content: `Many B2B salespeople believe a product demo is about explaining every feature of the software. They open the dashboard, click every button, and spend thirty minutes talking about menus the customer may never use.

The result is predictable. The builder becomes overwhelmed, loses interest, and remembers very little after the meeting.

A great demo is not about showing everything.

It is about solving the customer's biggest problems.

Before starting the demo, remind yourself why the builder agreed to meet you. Did they struggle with missed follow-ups? Poor lead tracking? Slow response times? Start there.

Show only the features that directly solve their problems. Once they see immediate value, they will naturally ask about the remaining features.

A customer doesn't buy software because it has more buttons.

They buy because it makes their business easier.

Example

A builder says,
"Our biggest problem is that sales executives forget to follow up with leads."

Instead of explaining every CRM module, demonstrate how PreSold automatically schedules reminders, sends notifications, and tracks every customer interaction.

Within five minutes, the builder understands how the software solves their biggest pain point.

That creates far more impact than a thirty-minute product tour.

Implementation

Before every demo, write down the customer's top three challenges and ensure your presentation focuses on solving those first.`
  },
  {
    id: 7,
    title: 'Learn to Handle Objections with Confidence',
    readingTime: 3,
    keyTakeaway: 'Treat every objection as a question that deserves understanding before answering.',
    content: `Every successful salesperson hears objections.

The difference is that top performers don't see objections as rejection.

They see them as opportunities to build trust.

When a builder says,
"Your CRM is expensive."

they are not always saying "No."

Often they are asking,
"Can you help me understand why it's worth the investment?"

Instead of arguing, understand the reason behind the objection.

Ask questions.

Listen carefully.

Respond calmly.

Your confidence during objections often matters more than your answer.

Never interrupt.

Never become defensive.

Help the customer make a better decision.

Example

A builder says,
"We're already using another CRM."

Instead of replying,
"Our CRM is better."

Say,
"That's great. May I ask what you like most about your current CRM, and what you wish it could do better?"

Now the conversation becomes collaborative instead of competitive.

The customer feels heard instead of pressured.

Implementation

Treat every objection as a question that deserves understanding before answering.`
  },
  {
    id: 8,
    title: 'Show the Return on Investment, Not Just the Price',
    readingTime: 3,
    keyTakeaway: 'Whenever discussing pricing, always explain the financial value the customer will receive before mentioning the cost.',
    content: `Every business owner thinks about one important question before buying software.

"Will this investment help my business grow?"

Unfortunately, many salespeople spend too much time discussing pricing plans instead of business results.

Instead of saying,
"Our CRM costs ₹50,000 per year."

Help the builder understand how much money they are currently losing without an organized sales process.

Missed follow-ups, duplicate enquiries, delayed responses, and poor reporting all have a financial cost.

When customers clearly see the return on investment, the conversation changes from price to value.

Builders don't buy software because it is affordable.

They buy because it helps them earn more than it costs.

Example

Suppose a builder receives 500 enquiries every month.

If poor follow-up causes just five customers to choose another builder, the business may lose several crores in potential revenue.

Now compare that with the annual cost of implementing a CRM.

Suddenly, the software feels like an investment instead of an expense.

Implementation

Whenever discussing pricing, always explain the financial value the customer will receive before mentioning the cost.`
  },
  {
    id: 9,
    title: 'Follow Up with Purpose, Not Pressure',
    readingTime: 3,
    keyTakeaway: 'Before every follow-up, ask yourself, "What value am I adding today?" If the answer is "Nothing," don\'t send the message.',
    content: `Many B2B deals are not closed during the first meeting.

Builders often need time to discuss decisions internally, compare options, or complete ongoing projects before purchasing new software.

This is why follow-up is one of the most important parts of B2B sales.

However, follow-up should never become harassment.

Calling every day and asking,
"Sir, any update?"

adds no value.

Instead, every follow-up should provide something useful.

Share a success story.
Send a case study.
Introduce a new feature.
Share an industry trend.
Offer a helpful suggestion.

When your follow-up educates the customer, they begin looking forward to hearing from you.

Example

Instead of sending,
"Just checking if you've made a decision."

Send,
"Hi Mr. Mehta, I thought you might find this case study interesting. One of our builder clients reduced missed follow-ups by 60% after implementing PreSold CRM."

Now you're helping instead of chasing.

Implementation

Before every follow-up, ask yourself,
"What value am I adding today?"

If the answer is "Nothing," don't send the message.`
  },
  {
    id: 10,
    title: 'Closing Is Helping the Customer Move Forward',
    readingTime: 3,
    keyTakeaway: 'Always end every meeting with one clear next step. A sale moves forward when both sides know exactly what happens next.',
    content: `Many people believe closing a sale means convincing someone to buy.

In reality, closing is simply helping the customer make a confident decision.

If you have understood their problems, demonstrated the right solution, answered their questions honestly, and built trust, the final step should feel natural.

Don't pressure customers.

Guide them.

Summarize everything you have discussed.

Remind them of the business challenges they wanted to solve.

Explain how PreSold will help achieve those goals.

Then confidently ask for the next step.

Sometimes that step is signing the agreement.
Sometimes it is scheduling implementation.
Sometimes it is introducing other decision-makers.

Closing is not about forcing urgency.

It is about creating clarity.

Example

Instead of saying,
"Can you sign today?"

Say,
"Based on everything we've discussed, it seems PreSold can help your team manage leads more efficiently, improve follow-ups, and give you better visibility into your sales pipeline. Would you like us to begin the onboarding process this week?"

The customer feels guided rather than pressured.

That is how professional B2B salespeople close deals.

Implementation

Always end every meeting with one clear next step.

A sale moves forward when both sides know exactly what happens next.`
  },
];

const CHAPTERS_PART3 = [
  {
    id: 11,
    title: 'Build Long-Term Relationships, Not One-Time Sales',
    readingTime: 3,
    keyTakeaway: 'Schedule regular customer check-ins after every successful implementation. Don\'t wait until renewal time to reconnect.',
    content: `Many salespeople believe their job ends after closing a deal. In reality, that's where the real relationship begins.

Builders don't buy CRM software every month. They invest in a long-term solution that should support their business for years. If your relationship ends after the agreement is signed, you're missing future opportunities for renewals, referrals, upgrades, and additional projects.

Stay connected with your clients even after implementation. Check how their team is using the platform. Celebrate their achievements. Offer new ideas that can improve their business.

When customers see that you're genuinely interested in their success, they stop treating you like a vendor.

They begin treating you like a business partner.

Strong relationships create trust, and trust creates long-term business.

Example

A month after implementation, a salesperson calls the builder—not to sell another product, but to ask,
"How is your sales team adapting to the CRM? Are there any challenges we can help you solve?"

The builder appreciates the support and becomes more confident in the partnership.

Months later, when the builder launches another project, they naturally think of PreSold first.

Implementation

Schedule regular customer check-ins after every successful implementation. Don't wait until renewal time to reconnect.`
  },
  {
    id: 12,
    title: 'Time Is Your Most Valuable Asset',
    readingTime: 3,
    keyTakeaway: 'At the beginning of every day, identify your three most important sales activities and complete them before anything else.',
    content: `Every salesperson gets the same twenty-four hours each day.

The difference between average performers and top performers is how they use those hours.

Many salespeople spend too much time on unqualified leads, unnecessary meetings, or repetitive administrative work. As a result, they have less time for the activities that actually generate revenue.

Successful B2B salespeople plan every day with purpose.

They prioritize high-value prospects, prepare before meetings, update the CRM immediately, and reserve time for follow-ups.

Good time management doesn't mean working longer.

It means working smarter.

Example

Two sales executives each have ten meetings in a week.

The first spends hours preparing for every meeting, researches the client, and follows up consistently.

The second attends meetings without preparation and forgets to record important details.

Both worked the same number of hours.

Only one created meaningful opportunities.

Preparation always saves time later.

Implementation

At the beginning of every day, identify your three most important sales activities and complete them before anything else.`
  },
  {
    id: 13,
    title: 'Become a Trusted Advisor, Not Just a Salesperson',
    readingTime: 3,
    keyTakeaway: 'Every meeting should leave the customer with at least one valuable idea they can use, whether or not they purchase PreSold.',
    content: `Customers have plenty of options when choosing software.

What they don't always find is someone who genuinely helps them make better business decisions.

Your role is not simply to explain PreSold CRM.

Your role is to help builders improve their sales process.

Share ideas.
Offer suggestions.
Point out opportunities they may have missed.
Recommend best practices, even if they don't immediately lead to a sale.

When customers consistently receive valuable advice from you, they begin trusting your opinion.

People buy from experts.

Not from people who only talk about products.

Example

During a meeting, a salesperson notices that the builder has no system for tracking enquiry sources.

Instead of immediately promoting the CRM, they explain how tracking lead sources can improve marketing decisions.

The builder realizes the salesperson understands business, not just software.

Trust grows naturally.

Implementation

Every meeting should leave the customer with at least one valuable idea they can use, whether or not they purchase PreSold.`
  },
  {
    id: 14,
    title: 'Learn from Every Sales Conversation',
    readingTime: 2,
    keyTakeaway: 'Spend ten minutes after every important meeting writing down three lessons you learned. Those notes will become your personal sales playbook.',
    content: `Not every meeting will end with a successful deal.

But every meeting should teach you something.

Great salespeople continuously improve because they review their conversations.

Ask yourself:
• What went well?
• Where did the customer lose interest?
• Which objections appeared most often?
• What questions surprised you?
• What could you improve next time?

Small improvements made consistently lead to significant results over time.

Experience alone doesn't make someone better.

Reflection does.

Example

A salesperson notices that three different builders asked about CRM implementation time during the same week.

Instead of answering differently every time, they create a simple implementation roadmap that explains the onboarding process.

Future meetings become much smoother.

Learning from previous conversations makes future conversations stronger.

Implementation

Spend ten minutes after every important meeting writing down three lessons you learned.

Those notes will become your personal sales playbook.`
  },
  {
    id: 15,
    title: 'Represent the PreSold Brand with Professionalism',
    readingTime: 3,
    keyTakeaway: 'Before ending every working day, ask yourself: "Did every customer interaction today increase the trust people have in PreSold?"',
    content: `Whenever you speak to a customer, you are not just representing yourself.

You represent the entire PreSold brand.

Your communication, appearance, punctuality, honesty, and professionalism shape how builders perceive the company.

Arrive on time.
Keep your promises.
Respond quickly.
Dress professionally during meetings.
Write clear emails.
Maintain respectful communication, even when customers disagree.

Professionalism is not a single action.

It is a habit repeated every day.

Customers remember reliability long after they forget presentations.

A strong brand is built through hundreds of consistent customer experiences.

Example

A builder asks for additional information after a product demo.

Instead of sending it two days later, the salesperson shares the requested documents within an hour, along with a short personalized message summarizing the discussion.

The builder immediately notices the team's professionalism.

That simple action strengthens confidence in the entire company.

Implementation

Before ending every working day, ask yourself one question:
"Did every customer interaction today increase the trust people have in PreSold?"

If the answer is yes, you're not just making sales—you are building a brand that customers will confidently recommend to others.`
  },
  {
    id: 16,
    title: 'Master the Art of Negotiation Without Reducing Value',
    readingTime: 3,
    keyTakeaway: 'Before discussing discounts, always explain how PreSold will improve efficiency, save time, and increase sales for the builder.',
    content: `Negotiation is one of the most misunderstood parts of B2B sales. Many salespeople believe that negotiating means offering discounts until the customer agrees. In reality, successful negotiation is about helping the customer understand the value they are receiving.

Builders are making an investment in a system that will improve their sales process, customer experience, and business growth. If the conversation revolves only around price, both sides lose sight of the real purpose of the partnership.

Instead of immediately reducing the price, understand why the customer is negotiating. Are they concerned about budget? Are they comparing competitors? Do they need additional value before making a decision?

When you understand the reason, you can respond with confidence instead of compromise.

Never negotiate from fear.

Negotiate from value.

Example

A builder says,
"Another CRM company is offering a lower price."

Instead of immediately matching the price, respond with,
"I completely understand. May I ask what features and support are included in that package? I'd like to help you compare both solutions fairly so you can make the best business decision."

The conversation shifts from price comparison to value comparison.

Customers who understand value rarely make decisions based only on cost.

Implementation

Before discussing discounts, always explain how PreSold will improve efficiency, save time, and increase sales for the builder.`
  },
  {
    id: 17,
    title: 'Turn Happy Clients into Brand Ambassadors',
    readingTime: 2,
    keyTakeaway: 'After every successful implementation, ask for one review, one testimonial, and one referral.',
    content: `Closing one deal is an achievement.

Creating customers who recommend your company is a long-term success.

Satisfied clients become your strongest marketing channel. Their recommendations carry more trust than any advertisement because they come from real experience.

Don't wait for customers to recommend PreSold on their own.

Ask for testimonials.
Request reviews.
Celebrate successful implementations.
Share customer success stories with permission.

Every happy customer has the potential to introduce you to another builder.

One successful implementation can open the door to many more opportunities.

Example

A builder successfully uses PreSold CRM for six months and notices a significant improvement in lead management.

Instead of simply thanking them, ask,
"Would you be comfortable sharing your experience in a short video? It will help other builders understand how PreSold has supported your business."

The testimonial becomes valuable content for future sales conversations.

Implementation

After every successful implementation, ask for one review, one testimonial, and one referral.`
  },
  {
    id: 18,
    title: 'Keep Learning Every Single Day',
    readingTime: 3,
    keyTakeaway: 'Spend at least thirty minutes every day learning something that makes you a better sales professional.',
    content: `The real estate industry changes constantly.

Customer expectations evolve.
Technology improves.
Sales techniques develop.

A successful B2B salesperson never stops learning.

Read about real estate trends.
Understand digital marketing.
Learn about AI automation.
Study negotiation.
Observe successful sales conversations.

Every new skill makes future conversations more valuable.

Customers respect sales professionals who continuously improve themselves.

Knowledge builds confidence.

Confidence builds credibility.

Example

A salesperson notices that many builders are asking about AI-powered WhatsApp automation.

Instead of giving basic answers, they spend time learning the feature in depth and understanding real customer use cases.

During the next meeting, they confidently explain how AI can reduce response time and improve customer engagement.

Preparation transforms ordinary conversations into expert consultations.

Implementation

Spend at least thirty minutes every day learning something that makes you a better sales professional.`
  },
  {
    id: 19,
    title: 'Success Comes from Consistency, Not Luck',
    readingTime: 3,
    keyTakeaway: 'Consistency always outperforms intensity. Create a daily success routine and follow it without exception, even on difficult days.',
    content: `Many people believe top-performing salespeople are simply lucky.

In reality, consistent results come from consistent habits.

Top performers don't wait for motivation.

They follow disciplined routines every day.

They prepare before meetings.
They update the CRM immediately.
They follow up on time.
They keep learning.
They review their performance.

Small actions repeated every day create extraordinary results over time.

Sales is not about occasional excellence.

It is about daily discipline.

Example

Two sales executives join the company on the same day.

One depends on motivation and works only when opportunities appear.

The other follows a daily routine of prospecting, learning, updating the CRM, and following up consistently.

After one year, the difference is remarkable.

Not because one was more talented.

Because one was more consistent.

Consistency always outperforms intensity.

Implementation

Create a daily success routine and follow it without exception, even on difficult days.`
  },
  {
    id: 20,
    title: 'Become a Trusted Growth Partner',
    readingTime: 3,
    keyTakeaway: 'At the end of every customer interaction, ask yourself: "Did I help this builder move one step closer to achieving their business goals?"',
    content: `The greatest B2B sales professionals don't think of themselves as software salespeople.

They think of themselves as business growth partners.

Their success is measured not by the number of products sold, but by the success of the customers they serve.

When a builder grows because of better lead management, faster follow-ups, improved customer experience, and stronger sales processes, both businesses grow together.

This mindset changes everything.

Instead of asking,
"How can I sell this CRM?"

Ask,
"How can I help this builder build a stronger business?"

Customers remember people who genuinely care about their success.

Products can be copied.
Prices can be matched.
Technology evolves.

But trust built through meaningful relationships becomes your greatest competitive advantage.

Example

A builder calls months after implementation with a question about improving sales performance.

Instead of treating it as a support request, the salesperson schedules a strategy meeting, reviews the builder's current process, and recommends improvements using PreSold CRM.

The builder doesn't just see a software provider anymore.

They see a trusted business partner.

That relationship leads to future projects, referrals, and long-term collaboration.

Implementation

At the end of every customer interaction, ask yourself one question:
"Did I help this builder move one step closer to achieving their business goals?"

If the answer is yes, you are no longer just selling software.

You are building partnerships, creating trust, and representing the true vision of PreSold CRM.`
  },
];

const ALL_CHAPTERS = [...CHAPTERS, ...CHAPTERS_PART2, ...CHAPTERS_PART3];

const buildFullText = () =>
  ALL_CHAPTERS.map(ch =>
    `Chapter ${ch.id} — ${ch.title}\n\n${ch.content}\n\nKey Takeaway: ${ch.keyTakeaway}`
  ).join('\n\n' + '─'.repeat(60) + '\n\n');

// ─── CHAPTER CARD ───────────────────────────────────────────────────────────
function ChapterCard({ chapter, isRead, isExpanded, isBookmarked, onToggleExpand, onMarkRead, onToggleBookmark, onPrev, onNext, searchQuery }) {
  const renderContent = (text) => {
    if (!searchQuery.trim()) {
      return text.split('\n').map((line, i, arr) => (
        <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
      ));
    }
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split('\n').map((line, i, arr) => {
      const parts = line.split(regex);
      return (
        <span key={i}>
          {parts.map((part, j) =>
            regex.test(part)
              ? <mark key={j} className="bg-yellow-400/30 text-yellow-200 rounded px-0.5">{part}</mark>
              : part
          )}
          {i < arr.length - 1 && <br />}
        </span>
      );
    });
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Chapter ${chapter.id}</title><style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;line-height:1.8;color:#111;}h1{font-size:1.4rem;}pre{white-space:pre-wrap;font-family:inherit;}</style></head><body><h1>Chapter ${chapter.id} — ${chapter.title}</h1><pre>${chapter.content}</pre><hr/><p><strong>Key Takeaway:</strong> ${chapter.keyTakeaway}</p></body></html>`);
    win.document.close(); win.print();
  };

  const handleDownload = () => {
    const text = `Chapter ${chapter.id} — ${chapter.title}\n\n${chapter.content}\n\nKey Takeaway: ${chapter.keyTakeaway}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `Chapter-${chapter.id}-B2B.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border transition-all duration-200 ${isRead ? 'border-green-500/30 bg-dark-800/80' : 'border-white/10 bg-dark-800'} shadow-lg`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${isRead ? 'bg-green-500/20 text-green-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
              {isRead ? <CheckCircle2 size={18} /> : chapter.id}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white leading-snug">Chapter {chapter.id} — {chapter.title}</h3>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${isRead ? 'bg-green-500/15 text-green-400' : 'bg-dark-600 text-gray-400'}`}>
                  {isRead ? '✓ Read' : 'Unread'}
                </span>
                <span className="text-[10px] text-cyan-400 font-medium">+{XP_PER_CHAPTER} XP</span>
                <span className="text-[10px] text-gray-500 flex items-center gap-1"><Clock size={10} /> {chapter.readingTime} min read</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={onToggleBookmark} className={`p-1.5 rounded-lg transition-colors ${isBookmarked ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`} title="Bookmark">
              <Bookmark size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>
            <button onClick={handlePrint} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors" title="Print"><Printer size={14} /></button>
            <button onClick={handleDownload} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors" title="Download"><Download size={14} /></button>
            <button onClick={onToggleExpand} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-dark-700 hover:bg-dark-600 text-xs font-medium text-gray-200 transition-colors">
              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
            <button onClick={onMarkRead} disabled={isRead}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isRead ? 'bg-green-600/20 text-green-400 cursor-default' : 'bg-cyan-600 text-white hover:bg-cyan-500'}`}>
              <Check size={13} />{isRead ? 'Read' : 'Mark as Read'}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="overflow-hidden">
            <div className="px-5 pb-5">
              <div className="border-t border-white/5 pt-5">
                <h2 className="text-lg font-bold text-white mb-1">Chapter {chapter.id}</h2>
                <h3 className="text-base font-semibold text-cyan-400 mb-5">{chapter.title}</h3>
                <div className="text-sm text-gray-300 leading-7 whitespace-pre-wrap font-light">{renderContent(chapter.content)}</div>
                <div className="mt-6 border-t border-white/10 pt-4">
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <CheckCircle2 size={15} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400 mb-1">Key Takeaway</p>
                      <p className="text-sm text-gray-200 italic">{chapter.keyTakeaway}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <button onClick={onPrev} disabled={chapter.id === 1}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-dark-700 hover:bg-dark-600 text-xs font-medium text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ArrowLeft size={13} /> Previous Chapter
                  </button>
                  <span className="text-[10px] text-gray-500">{chapter.id} / {TOTAL_CHAPTERS}</span>
                  <button onClick={onNext} disabled={chapter.id === TOTAL_CHAPTERS}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-dark-700 hover:bg-dark-600 text-xs font-medium text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    Next Chapter <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function PlaybookB2B() {
  const [readIds, setReadIds] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const chapterRefs = useRef({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/playbook/b2b-progress');
        setReadIds(res.data.map(c => parseInt(c.chapterId.replace('b2b-ch-', ''))));
      } catch {
        try { setReadIds(JSON.parse(localStorage.getItem('b2b-playbook-read') || '[]')); } catch { /**/ }
      }
      try { setBookmarkedIds(JSON.parse(localStorage.getItem('b2b-playbook-bookmarks') || '[]')); } catch { /**/ }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (!e.ctrlKey) return;
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const ids = filteredChapters.map(c => c.id);
      if (expandedIds.length === 0) { if (ids.length > 0) toggleExpand(ids[0]); return; }
      const last = expandedIds[expandedIds.length - 1];
      const idx = ids.indexOf(last);
      if (e.key === 'ArrowRight' && idx < ids.length - 1) { toggleExpand(ids[idx + 1]); scrollTo(ids[idx + 1]); }
      else if (e.key === 'ArrowLeft' && idx > 0) { toggleExpand(ids[idx - 1]); scrollTo(ids[idx - 1]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [expandedIds]);

  const scrollTo = (id) => setTimeout(() => chapterRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

  const toggleExpand = useCallback((id) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const markRead = async (id) => {
    if (readIds.includes(id)) return;
    const next = [...readIds, id];
    setReadIds(next);
    localStorage.setItem('b2b-playbook-read', JSON.stringify(next));
    try {
      await api.post(`/playbook/b2b-complete/${id}`);
      window.dispatchEvent(new CustomEvent('xp:update', { detail: { xpGain: XP_PER_CHAPTER } }));
    } catch { /**/ }
    toast.success(`+${XP_PER_CHAPTER} XP — Chapter ${id} completed!`);
    if (id < TOTAL_CHAPTERS) { const nxt = id + 1; setExpandedIds(p => p.includes(nxt) ? p : [...p, nxt]); scrollTo(nxt); }
  };

  const toggleBookmark = (id) => {
    const next = bookmarkedIds.includes(id) ? bookmarkedIds.filter(x => x !== id) : [...bookmarkedIds, id];
    setBookmarkedIds(next);
    localStorage.setItem('b2b-playbook-bookmarks', JSON.stringify(next));
    toast.success(bookmarkedIds.includes(id) ? 'Bookmark removed' : 'Chapter bookmarked');
  };

  const copyPlaybook = async () => {
    try {
      await navigator.clipboard.writeText(buildFullText());
      setCopied(true); toast.success('Full playbook copied');
      setTimeout(() => setCopied(false), 2500);
    } catch { toast.error('Copy failed'); }
  };

  const filteredChapters = ALL_CHAPTERS.filter(ch => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return ch.title.toLowerCase().includes(q) || ch.content.toLowerCase().includes(q) || ch.keyTakeaway.toLowerCase().includes(q) || `chapter ${ch.id}`.includes(q);
  });

  const completedCount = readIds.length;
  const earnedXp = completedCount * XP_PER_CHAPTER;
  const progress = Math.round((completedCount / TOTAL_CHAPTERS) * 100);
  const allDone = completedCount === TOTAL_CHAPTERS;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* HEADER */}
      <div className="glass-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={18} className="text-cyan-400" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">B2B Sales Team</span>
            </div>
            <h1 className="text-xl font-bold text-white">B2B Sales Playbook</h1>
            <p className="text-sm text-gray-400 mt-1">Complete learning guide for B2B Sales Team.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-center px-3 py-2 rounded-xl bg-dark-700 border border-white/5">
              <p className="text-xs font-bold text-white">{completedCount}/{TOTAL_CHAPTERS}</p>
              <p className="text-[10px] text-gray-500">Chapters Read</p>
            </div>
            <div className="text-center px-3 py-2 rounded-xl bg-dark-700 border border-white/5">
              <p className="text-xs font-bold text-cyan-400">{earnedXp} XP</p>
              <p className="text-[10px] text-gray-500">XP Earned</p>
            </div>
            <button onClick={copyPlaybook} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Full Playbook'}
            </button>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-gray-400">Progress</span>
            <span className="text-[11px] text-gray-400">{progress}%</span>
          </div>
          <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.6 }}
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />
          </div>
          <p className="text-[10px] text-gray-500 mt-1.5">Ctrl+→ / Ctrl+← to navigate • {TOTAL_XP - earnedXp} XP remaining</p>
        </div>
      </div>

      {/* COMPLETION BANNER */}
      <AnimatePresence>
        {allDone && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="glass-card p-6 border border-cyan-500/30 bg-cyan-500/5 text-center">
            <Trophy size={36} className="text-cyan-400 mx-auto mb-2" />
            <h2 className="text-lg font-bold text-white">🎉 Congratulations!</h2>
            <p className="text-sm text-gray-300 mt-1">B2B Sales Playbook Completed</p>
            <p className="text-cyan-400 font-bold mt-2">{TOTAL_XP} XP Earned</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SEARCH */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search chapters, examples, keywords..."
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"><X size={14} /></button>
        )}
      </div>
      {search && <p className="text-xs text-gray-500 -mt-4">{filteredChapters.length} chapter{filteredChapters.length !== 1 ? 's' : ''} found</p>}

      {/* CARDS */}
      <div className="space-y-3">
        {filteredChapters.length === 0
          ? <div className="text-center py-12 text-gray-500 text-sm">No chapters match your search.</div>
          : filteredChapters.map(ch => (
            <div key={ch.id} ref={el => chapterRefs.current[ch.id] = el}>
              <ChapterCard
                chapter={ch}
                isRead={readIds.includes(ch.id)}
                isExpanded={expandedIds.includes(ch.id)}
                isBookmarked={bookmarkedIds.includes(ch.id)}
                onToggleExpand={() => toggleExpand(ch.id)}
                onMarkRead={() => markRead(ch.id)}
                onToggleBookmark={() => toggleBookmark(ch.id)}
                searchQuery={search}
                onPrev={() => { if (ch.id > 1) { toggleExpand(ch.id - 1); scrollTo(ch.id - 1); } }}
                onNext={() => { if (ch.id < TOTAL_CHAPTERS) { toggleExpand(ch.id + 1); scrollTo(ch.id + 1); } }}
              />
            </div>
          ))
        }
      </div>

      {/* BOOKMARKS */}
      {bookmarkedIds.length > 0 && !search && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Bookmark size={14} className="text-yellow-400" /> Bookmarked Chapters
          </h3>
          <div className="flex flex-wrap gap-2">
            {bookmarkedIds.sort((a, b) => a - b).map(id => {
              const ch = ALL_CHAPTERS.find(c => c.id === id);
              return ch ? (
                <button key={id} onClick={() => { toggleExpand(id); scrollTo(id); }}
                  className="px-3 py-1.5 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 text-xs hover:bg-yellow-400/20 transition-colors">
                  Ch. {id} — {ch.title.length > 28 ? ch.title.slice(0, 28) + '…' : ch.title}
                </button>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
