import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronUp, Check, Copy, Search, Bookmark,
  BookOpen, Clock, ArrowLeft, ArrowRight, X, Trophy,
  CheckCircle2, Circle, Star, Printer, Download, Moon
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

// ─── CHAPTER DATA (exact text from PDF) ────────────────────────────────────────
const CHAPTERS = [
  {
    id: 1,
    title: 'Know Who You\'re Building For',
    readingTime: 3,
    keyTakeaway: 'The clearer your ideal customer becomes, the easier your marketing becomes.',
    content: `Every successful real estate project starts long before the first brick is laid. It starts by understanding the people who will eventually call that place "home." Yet many builders launch projects with the belief that everyone is a potential customer. The result is predictable—they spend heavily on advertisements, receive hundreds of enquiries, and still struggle to convert them into bookings.

The problem isn't the project. The problem is the audience.

A customer buying their first home has completely different priorities than someone purchasing a luxury apartment or an investor looking for rental income. A young IT professional wants shorter travel time to work, modern amenities, and affordable EMI options. A family with children wants schools, hospitals, parks, and safety. An investor wants appreciation, rental demand, and future infrastructure development.

When all these people receive the same marketing message, nobody feels like the project was built specifically for them.

Before running a single advertisement, ask yourself a simple question:

"Who is the one person this project is perfect for?"

The clearer your answer becomes, the easier your marketing becomes.

Instead of promoting every feature your project offers, start speaking directly to the problems your ideal customer wants to solve. People don't buy apartments because they have Italian flooring or modular kitchens. They buy because they want a better lifestyle, shorter commutes, financial security, or a safe place for their family.

Once you understand that difference, your advertisements become more effective, your sales conversations become shorter, and your conversion rate naturally improves.

Example

Imagine two advertisements.

Advertisement One says,
"Premium 2 & 3 BHK Apartments with Modern Amenities."

Advertisement Two says,
"Designed for IT professionals working in Hinjewadi. Reach your office in just 10 minutes while giving your family a premium lifestyle with parks, clubhouse, and top schools nearby."

Both advertisements are selling the same project.

The second advertisement speaks directly to a specific buyer.

That's why it performs better.

Implementation

Before launching any campaign, write down your ideal customer's:
• Age
• Profession
• Budget
• Family Size
• Buying Purpose
• Biggest Problem
• Biggest Dream

If every member of your sales team knows this customer, every conversation becomes easier.`
  },
  {
    id: 2,
    title: 'Sell the Lifestyle, Not the Building',
    readingTime: 3,
    keyTakeaway: 'People remember emotions. They forget specifications.',
    content: `Customers rarely fall in love with concrete walls.

They fall in love with the life they imagine after moving in.

Unfortunately, many builders spend their entire marketing budget talking about square feet, vitrified tiles, branded elevators, and parking spaces. While these things are important, they are rarely the reason someone decides to buy a home.

People don't wake up thinking,
"Today I want to buy a flat with anti-skid tiles."

They think,
"I want my children to grow up in a better environment."

or
"I'm tired of travelling two hours every day."

or
"I want a place that my parents will be proud of."

Notice the difference.

Features describe a property.

Benefits describe a better life.

Great builders understand that they are not selling apartments—they are selling dreams, security, comfort, convenience, and status.

Whenever you describe your project, ask yourself,
"How does this feature improve the customer's life?"

That answer should always come before the feature itself.

Example

Instead of saying,
"Our project has a swimming pool."

Say,
"Imagine spending every Sunday evening with your family beside the pool instead of sitting inside your apartment."

Instead of saying,
"We have covered parking."

Say,
"Your car stays protected from rain and heat every single day."

People remember emotions.

They forget specifications.

Implementation

For every feature in your project, write one lifestyle benefit.

Do not sell the apartment.

Sell the life that comes with it.`
  },
  {
    id: 3,
    title: 'Build Trust Before You Ask for the Sale',
    readingTime: 3,
    keyTakeaway: 'The more proof you provide before the first meeting, the less convincing your sales team needs to do later.',
    content: `Buying a home is one of the biggest financial decisions a person will ever make.

Before customers compare prices, they compare trust.

If they don't trust you, even the best offer will fail.

Many builders wait until customers ask questions like,
"Is your project RERA approved?"
"How many projects have you completed?"
"Can I trust your company?"

By then, doubt has already entered the customer's mind.

Smart builders remove those doubts before they appear.

Show your completed projects.
Show real customer testimonials.
Show construction updates.
Show your team.
Show your awards.
Show your RERA registration.
Show handover ceremonies.

Trust is not built by saying,
"We are the best builder."

Trust is built by proving it.

The more proof you provide before the first meeting, the less convincing your sales team needs to do later.

Example

Imagine two builders.

Builder A immediately starts discussing offers and discounts.

Builder B first shows videos of completed projects, happy homeowners receiving keys, customer interviews, and construction quality.

Both builders have similar pricing.

Most customers naturally trust Builder B.

Because proof is always stronger than promises.

Implementation

Every week, create at least one piece of content that answers this question:
"Why should someone trust us?"

The more proof you show, the easier every sale becomes.`
  },
  {
    id: 4,
    title: 'Every Lead Deserves an Immediate Response',
    readingTime: 3,
    keyTakeaway: 'The first builder to respond often becomes the first builder the customer remembers.',
    content: `A customer who fills out your enquiry form is excited at that exact moment.

That excitement doesn't last forever.

If you reply after four hours—or worse, the next day—the customer has already spoken to three other builders.

Speed creates trust.

Silence creates doubt.

Many builders believe customers are willing to wait.

They aren't.

When someone submits their phone number, they expect confirmation immediately. Even if a salesperson isn't available, an automated message lets them know their enquiry has been received.

The first builder to respond often becomes the first builder the customer remembers.

Fast responses don't just improve customer experience—they increase the chances of booking site visits and building relationships before competitors step in.

Example

A customer fills out a Meta Lead Form at 8:30 PM.

Within one minute they receive a WhatsApp message:
"Thank you for your interest in Green Heights. Our property advisor will contact you shortly. Meanwhile, here's our project brochure and a short walkthrough video."

The customer immediately feels acknowledged.

Now compare that with a builder who calls the next afternoon.

The difference isn't technology.

It's discipline.

Implementation

Never allow a new enquiry to wait without acknowledgement.

Even a simple welcome message is better than silence.`
  },
  {
    id: 5,
    title: 'Every Project Needs One Source of Truth',
    readingTime: 3,
    keyTakeaway: 'Consistency creates professionalism. Professionalism creates trust. And trust creates bookings.',
    content: `Nothing destroys confidence faster than inconsistent information.

Imagine one salesperson says the starting price is ₹65 lakh.

Another says ₹68 lakh.

A brochure mentions different amenities.

The website shows an old floor plan.

The customer immediately starts wondering,
"If they can't manage basic information, how will they manage my home?"

Every project should have one master document containing the latest information.

Whenever pricing changes, payment plans change, offers change, or construction updates are released, update this document first.

Every salesperson, marketing executive, and channel partner should use only this version.

Consistency creates professionalism.

Professionalism creates trust.

And trust creates bookings.

Example

A customer asks,
"Is possession in December or March?"

Instead of checking multiple WhatsApp groups, the salesperson opens the latest Project Profile and confidently answers,
"Construction is progressing as scheduled, and possession is planned for March 2028. Here's the latest construction update as well."

The customer receives one clear answer.

No confusion.

No guessing.

Just confidence.

Implementation

Create a digital Project Profile that includes:
• Latest Pricing
• Floor Plans
• Amenities
• Construction Status
• Payment Plans
• Offers
• RERA Details
• FAQs
• Sales Brochure
• Site Photos

Every update should happen there first before it reaches customers.`
  },
  {
    id: 6,
    title: 'Every Lead Is Not Your Customer',
    readingTime: 3,
    keyTakeaway: 'The goal is not to collect more leads. The goal is to identify the right leads.',
    content: `One of the biggest mistakes builders make is believing that every enquiry is a potential buyer. The reality is different. Some people are just exploring the market. Some are comparing prices. Some are investors. Others may not even have the budget to buy.

If your sales team spends the same amount of time on every lead, they will waste hours chasing people who were never serious in the first place.

The goal is not to collect more leads. The goal is to identify the right leads.

The first conversation should never be about convincing the customer to buy. It should be about understanding whether the project is the right fit for them.

Simple questions can save hours of follow-up later.

Ask about their budget, preferred location, family requirements, and expected purchase timeline. Their answers will immediately tell you how serious they are.

When you qualify leads early, your sales team spends more time with buyers and less time with browsers.

Example

Two customers enquire about the same project.

The first customer says,
"I'm planning to buy within the next two months. My budget is ₹70 lakh, and I'm looking for a home near my office."

The second customer says,
"I'm just checking prices. Maybe next year."

Both deserve a good experience, but they should not receive the same level of follow-up.

Focus your immediate efforts on customers who are ready to buy.

Implementation

Every new enquiry should answer four simple questions:
• What is your budget?
• Which location do you prefer?
• Are you buying for yourself or investment?
• When do you plan to purchase?

These four answers can completely change your sales strategy.`
  },
  {
    id: 7,
    title: 'Follow-Up Is Where Most Sales Are Won',
    readingTime: 4,
    keyTakeaway: 'Consistent and valuable follow-ups build familiarity. And people are more likely to buy from someone they remember.',
    content: `Many builders believe that if a customer is interested, they will call back.

Unfortunately, that's rarely how buying decisions work.

Customers get busy. They compare different projects. Family members give different opinions. Banks delay loan approvals. Life happens.

Silence doesn't always mean rejection.

It often means the customer simply needs another reason to continue the conversation.

The biggest mistake sales teams make is stopping follow-ups after two or three attempts. Consistent and valuable follow-ups build familiarity. And people are more likely to buy from someone they remember.

A follow-up should never feel like pressure.

Instead of asking,
"Sir, have you decided?"

Share something useful.

Construction updates.
New payment plans.
Festival offers.
Loan assistance.
Nearby infrastructure developments.

Each conversation should add value.

Example

A customer visited your site but didn't book.

Instead of calling every day asking for a decision, send them a construction update after one week.

"Hi Rahul, Tower B has completed its 10th floor this week. Sharing the latest construction photos. Let me know if you'd like another site visit."

Now you're providing information instead of creating pressure.

Implementation

Build a follow-up calendar instead of following up randomly.

Customers appreciate consistency.`
  },
  {
    id: 8,
    title: 'Stop Answering Questions. Start Solving Doubts.',
    readingTime: 3,
    keyTakeaway: 'Customers don\'t buy when every question is answered. They buy when every doubt disappears.',
    content: `Most customers have similar concerns.

"Is the builder trustworthy?"
"Will the project be completed on time?"
"Is this the right location?"
"Should I wait for prices to come down?"

If your sales team answers these questions individually every day, they are repeating the same work again and again.

Instead, create content that answers these doubts before customers ask them.

A one-minute video explaining your construction quality can answer hundreds of future conversations.

A short article about RERA can remove fear before it appears.

When customers already know the answers, your sales meeting becomes much smoother.

Remember, customers don't buy when every question is answered.

They buy when every doubt disappears.

Example

Many buyers ask,
"Why is your project priced higher than others nearby?"

Instead of explaining this individually every time, record a simple video comparing construction quality, amenities, location advantages, and long-term value.

Now every interested buyer receives the same explanation before visiting the site.

Your team saves time.

Customers arrive with greater confidence.

Implementation

Write down your ten most common customer questions.

Turn each one into a simple video, blog, or brochure.

Soon, your marketing will start educating customers automatically.`
  },
  {
    id: 9,
    title: 'Your CRM Should Remember Everything',
    readingTime: 3,
    keyTakeaway: 'A CRM isn\'t just software. It\'s the memory of your business.',
    content: `Customers expect businesses to remember them.

Nothing feels more unprofessional than asking a returning customer the same questions again.

Imagine visiting a project for the second time, and the salesperson asks,
"Sir, what is your budget again?"

Immediately, the customer feels forgotten.

A CRM isn't just software.

It's the memory of your business.

Every conversation, phone call, WhatsApp message, site visit, objection, and follow-up should be recorded.

When the customer returns after two weeks, the salesperson should already know their budget, preferred floor, family requirements, and previous discussions.

This creates a premium customer experience.

Example

A customer visits in January.

He says,
"I need a 3 BHK because my parents will stay with us."

He returns in February.

Instead of asking basic questions again, the salesperson says,
"Welcome back, Mr. Sharma. Last time you were looking for a 3 BHK for your parents. We now have a corner unit available that I think you'll really like."

The customer immediately feels valued.

That's the power of a well-maintained CRM.

Implementation

Update customer information immediately after every interaction.

Never trust your memory.

Trust your system.`
  },
  {
    id: 10,
    title: 'Every Site Visit Is a Job Interview',
    readingTime: 3,
    keyTakeaway: 'People remember how they were treated long after they forget technical specifications.',
    content: `Customers don't just inspect your project.

They inspect your company.

From the security guard at the gate to the salesperson showing the sample flat, every interaction shapes their opinion.

A poorly managed site visit can destroy months of marketing effort.

A well-planned visit can create excitement before the sales discussion even begins.

Prepare your site before customers arrive.

Keep the sample flat clean.

Ensure brochures are updated.

Offer refreshments.

Assign one relationship manager who stays with the customer throughout the visit.

People remember how they were treated long after they forget technical specifications.

Great hospitality creates emotional connection.

And emotional connection often becomes the deciding factor.

Example

Two builders offer almost identical apartments.

One simply opens the sample flat and hands over a brochure.

The other welcomes the family by name, offers refreshments, explains every feature patiently, answers questions honestly, and thanks them personally before they leave.

Both projects may be similar.

The experience isn't.

Customers rarely forget how a builder made them feel.

Implementation

Treat every site visit like an important interview.

Because while you're evaluating whether the customer will buy, the customer is also deciding whether they can trust you with one of the biggest investments of their life.`
  },
  {
    id: 11,
    title: 'Don\'t Sell Price. Sell Value.',
    readingTime: 3,
    keyTakeaway: 'When customers clearly understand the value, the price becomes easier to accept.',
    content: `One of the most common mistakes builders make is leading every conversation with the price. While customers always ask about the cost, the price is rarely the first thing that convinces them to buy. What they really want to know is whether the property is worth the investment.

When a salesperson focuses only on discounts, offers, and payment plans, the customer starts comparing the project only by numbers. Eventually, the conversation becomes a price war.

Instead, help customers understand what makes your project valuable. Talk about the location, future infrastructure, construction quality, builder reputation, rental demand, and long-term appreciation. When customers clearly understand the value, the price becomes easier to accept.

People don't mind paying more for something they truly believe is better.

Example

Imagine two builders selling similar apartments.

Builder A says,
"We are giving ₹2 lakh discount this month."

Builder B says,
"This project is just five minutes from the upcoming metro station. Similar properties in this area have appreciated by nearly 25% over the last three years. You're not just buying a home—you're investing in a location with strong future growth."

The second conversation shifts the customer's focus from cost to value.

Implementation

Whenever discussing price, always explain why the project deserves that value before mentioning any discounts.`
  },
  {
    id: 12,
    title: 'Keep Customers Updated Even After They Leave',
    readingTime: 3,
    keyTakeaway: 'Regular updates keep your project alive in the customer\'s mind.',
    content: `Many builders stay in constant touch with customers before a site visit, but once the visit is over, communication slowly disappears. This creates uncertainty. Customers begin to wonder if the builder is still interested or if the project has stopped progressing.

Regular updates keep your project alive in the customer's mind.

A simple construction update, a drone video, or a message about project progress reminds customers that work is moving forward. It also shows transparency, which builds confidence.

Customers appreciate businesses that communicate without always trying to sell.

Example

A family visits your project in January but doesn't make an immediate decision.

Every two weeks, they receive:
• Latest construction photos
• Progress videos
• Bank loan partner updates
• Festival greetings
• New amenities under development

After three months, when they're finally ready to buy, your project is the first one they remember.

Implementation

Create a monthly communication calendar so every interested customer receives valuable updates, whether or not they have made a purchase.`
  },
  {
    id: 13,
    title: 'Happy Customers Are Your Best Marketing Team',
    readingTime: 3,
    keyTakeaway: 'Real stories build real trust.',
    content: `No advertisement is more powerful than a satisfied customer sharing their experience.

People trust homeowners more than they trust advertisements because homeowners have already lived through the buying journey. Their experience feels genuine.

Instead of asking customers only for feedback, encourage them to share their stories.

Record short interviews after possession.

Capture videos of families receiving their keys.

Celebrate milestones with them.

These stories become powerful proof for future buyers.

Example

A family moves into your project.

Instead of only handing over the keys, your team records a two-minute video asking simple questions:
• Why did you choose this project?
• What did you like most?
• How has your experience been?

Future customers watching this video immediately gain confidence.

Real stories build real trust.

Implementation

Every successful handover should create at least one testimonial that can be shared on your website and social media.`
  },
  {
    id: 14,
    title: 'Every Objection Is an Opportunity',
    readingTime: 3,
    keyTakeaway: 'Every objection tells you exactly what information the customer still needs.',
    content: `Customers asking questions doesn't mean they are rejecting your project.

In fact, objections often indicate genuine interest.

Someone who asks,
"Is this location developing fast enough?"

or
"Can I get a better price?"

is usually trying to gain confidence before making a decision.

The mistake many salespeople make is becoming defensive.

Instead, welcome objections.

Every objection tells you exactly what information the customer still needs.

If the same objection appears repeatedly, don't leave it for the sales team to answer every time.

Create content that addresses it before the next customer asks.

Example

Your team notices that almost every customer asks,
"Why is this project more expensive than nearby projects?"

Instead of explaining it individually forever, create a simple comparison brochure showing:
• Better construction quality
• Larger open spaces
• Premium amenities
• Trusted builder history
• Better future appreciation

Now one document answers the question for every future buyer.

Implementation

Review customer objections every month.

If five customers ask the same question, your marketing should answer it before the sixth customer arrives.`
  },
  {
    id: 15,
    title: 'Great Builders Build Relationships, Not Just Projects',
    readingTime: 3,
    keyTakeaway: 'A relationship built after the sale often generates the next sale without spending a single rupee on advertising.',
    content: `The sale shouldn't be the end of the relationship.

It should be the beginning.

Many builders disappear after receiving the booking amount. Customers are left wondering about documentation, construction updates, loan processes, and possession timelines.

Builders who continue supporting customers after booking create something much more valuable than a sale.

They create loyalty.

Satisfied customers don't just buy once.

They recommend your company to friends, relatives, and colleagues.

In real estate, referrals often become the highest-quality leads because they come with built-in trust.

A customer who feels cared for becomes your strongest brand ambassador.

Example

After booking, your customer receives regular updates:
• Construction milestones
• Loan assistance
• Legal documentation support
• Festival greetings
• Invitation to project events
• Possession preparation checklist

Instead of feeling like "Customer Number 248," they feel like part of your community.

Years later, when someone asks them for a builder recommendation, your name is the first they mention.

Implementation

Create a customer journey that continues well beyond booking.

A relationship built after the sale often generates the next sale without spending a single rupee on advertising.`
  },
  {
    id: 16,
    title: 'Make Every Customer Feel Special',
    readingTime: 3,
    keyTakeaway: 'People may forget what you said, but they rarely forget how you made them feel.',
    content: `A customer may visit dozens of projects before making a final decision. Many of those projects will have similar layouts, amenities, and prices. What customers remember most is not always the building—it is how they were treated.

The difference between an average builder and a premium builder often lies in the experience they create. Calling a customer by their name, remembering their previous visit, understanding their requirements, and making them feel valued creates a lasting impression.

Customers don't expect luxury. They expect respect.

A simple welcome, a warm conversation, and genuine interest in their needs can create more impact than an expensive marketing campaign.

People may forget what you said, but they rarely forget how you made them feel.

Example

A customer visits your sales office for the second time.

Instead of asking,
"How can I help you?"

Your relationship manager says,
"Welcome back, Mr. Sharma. Last time you mentioned you were looking for a 3 BHK because your parents would be staying with you. We've shortlisted two units that perfectly match your requirement."

The customer immediately feels that they matter.

That's the beginning of trust.

Implementation

Treat every customer like a guest, not a sales target. Small gestures create long-term relationships.`
  },
  {
    id: 17,
    title: 'Learn From Every Lost Deal',
    readingTime: 3,
    keyTakeaway: 'A lost sale is not a failure—it is feedback.',
    content: `Every builder celebrates successful bookings, but very few study the customers they lost.

A lost sale is not a failure—it is feedback.

When customers choose another project, there is always a reason. Maybe the location was better. Maybe the payment plan was easier. Maybe another builder responded faster. Maybe the customer never received proper follow-up.

If you don't understand why deals are lost, the same mistakes will continue.

Every month, review your lost opportunities with your sales team. Look for patterns instead of blaming individual salespeople.

Improvement begins when you understand the real reason customers walked away.

Example

After reviewing twenty lost deals, a builder discovered that most customers wanted flexible payment plans.

The project itself wasn't the problem.

The payment structure was.

After introducing a construction-linked payment option, bookings increased without changing the project or reducing prices.

Sometimes a small improvement solves a much bigger problem.

Implementation

Maintain a "Lost Deal Register" where every unsuccessful enquiry includes one simple question:
"Why did we lose this customer?"

Those answers become your roadmap for improvement.`
  },
  {
    id: 18,
    title: 'Your Reputation Is Built Every Day',
    readingTime: 3,
    keyTakeaway: 'Transparency always wins.',
    content: `Reputation isn't created by one successful project.

It is built through hundreds of small actions that customers notice every day.

How quickly do you answer calls?

Do you deliver what you promise?

Are construction updates transparent?

Do you communicate honestly when delays happen?

Customers understand that challenges can occur during construction. What they don't forgive is silence.

Honesty builds confidence.

False promises destroy it.

A strong reputation reduces the amount of selling your team needs to do because customers already believe in your brand before they visit your project.

Example

Heavy rains delay construction by three weeks.

Builder A ignores customer calls.

Builder B immediately sends a message explaining the delay, shares updated timelines, and uploads fresh construction photographs.

Both projects faced the same problem.

Only one builder strengthened customer trust.

Transparency always wins.

Implementation

Protect your reputation by communicating early, honestly, and consistently.

A trusted builder sells faster than an unknown builder.`
  },
  {
    id: 19,
    title: 'Referrals Are the Cheapest Leads You\'ll Ever Get',
    readingTime: 3,
    keyTakeaway: 'One happy customer creates many more.',
    content: `Advertising will always cost money.

Satisfied customers can bring new buyers for free.

When people buy a home, friends, relatives, and colleagues naturally ask about their experience.

If that experience is positive, your customers become your strongest marketing team.

Unfortunately, many builders never ask for referrals.

They assume customers will recommend them automatically.

Some will.

Most won't.

Not because they are unhappy, but because nobody asked.

Create a simple referral program that rewards customers for introducing genuine buyers.

The reward doesn't always have to be cash.

It could be a gift voucher, maintenance support, premium home accessories, or exclusive community benefits.

The goal is appreciation, not bribery.

Example

A customer refers two of their office colleagues.

Both eventually purchase apartments.

Instead of just saying "Thank You," the builder presents the customer with a premium home appliance and publicly appreciates them during a community event.

Now other residents are encouraged to refer buyers as well.

One happy customer creates many more.

Implementation

Every satisfied homeowner should know exactly how they can refer friends and what appreciation they will receive.`
  },
  {
    id: 20,
    title: 'Build Systems That Work Without You',
    readingTime: 4,
    keyTakeaway: 'If the answer is yes, you\'ve built a business. If the answer is no, you\'re still running on people instead of processes.',
    content: `The biggest goal of every builder should not be selling one successful project.

It should be creating a business that delivers consistent results, even when the owner is not personally involved in every decision.

Many builders become the answer to every question.

Salespeople wait for approvals.

Marketing teams wait for instructions.

Customers ask only for the owner.

As the business grows, this becomes impossible to manage.

The solution is not working harder.

The solution is building better systems.

Document your sales process.

Standardize customer communication.

Create follow-up schedules.

Maintain updated project information.

Use your CRM properly.

Train every new employee using the same playbook.

When every team member follows the same process, customers receive the same professional experience regardless of who they speak with.

That's how businesses scale.

Not by depending on one person, but by creating systems that everyone can follow.

Example

A builder has three different sales offices.

Instead of allowing every branch to work differently, they create one standard process:
• Every enquiry receives a response within five minutes.
• Every customer is qualified using the same questions.
• Every site visit follows the same experience.
• Every follow-up happens on fixed intervals.
• Every objection has a prepared response.
• Every booking follows the same documentation process.

The result is consistency.

Customers receive the same premium experience across every location.

And the business continues to grow because it runs on systems rather than individuals.

Implementation

Ask yourself one simple question:

"If I don't come to the office tomorrow, will my business still deliver the same customer experience?"

If the answer is yes, you've built a business.

If the answer is no, you're still running on people instead of processes.`
  }
];

const TOTAL_CHAPTERS = 20;
const XP_PER_CHAPTER = 15;
const TOTAL_XP = TOTAL_CHAPTERS * XP_PER_CHAPTER;


// ─── FULL PLAYBOOK TEXT for copy button ────────────────────────────────────────
const buildFullPlaybookText = () =>
  CHAPTERS.map(ch =>
    `Chapter ${ch.id} — ${ch.title}\n\n${ch.content}\n\nKey Takeaway: ${ch.keyTakeaway}`
  ).join('\n\n' + '─'.repeat(60) + '\n\n');

// ─── CHAPTER CARD ───────────────────────────────────────────────────────────────
function ChapterCard({ chapter, isRead, isExpanded, isBookmarked, onToggleExpand, onMarkRead, onToggleBookmark, onPrev, onNext, searchQuery }) {
  const contentRef = useRef(null);

  const highlight = (text) => {
    if (!searchQuery.trim()) return text;
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '**$1**');
  };

  const renderContent = (text) => {
    if (!searchQuery.trim()) {
      return text.split('\n').map((line, i) => (
        <span key={i}>
          {line}
          {i < text.split('\n').length - 1 && <br />}
        </span>
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
    win.document.close();
    win.print();
  };

  const handleDownload = () => {
    const text = `Chapter ${chapter.id} — ${chapter.title}\n\n${chapter.content}\n\nKey Takeaway: ${chapter.keyTakeaway}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Chapter-${chapter.id}-${chapter.title.replace(/[^a-z0-9]/gi, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border transition-all duration-200 ${isRead ? 'border-green-500/30 bg-dark-800/80' : 'border-white/10 bg-dark-800'} shadow-lg`}
    >
      {/* Card Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${isRead ? 'bg-green-500/20 text-green-400' : 'bg-brand-500/20 text-brand-400'}`}>
              {isRead ? <CheckCircle2 size={18} /> : chapter.id}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white leading-snug">
                Chapter {chapter.id} — {chapter.title}
              </h3>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${isRead ? 'bg-green-500/15 text-green-400' : 'bg-dark-600 text-gray-400'}`}>
                  {isRead ? '✓ Read' : 'Unread'}
                </span>
                <span className="text-[10px] text-brand-400 font-medium">+{XP_PER_CHAPTER} XP</span>
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Clock size={10} /> {chapter.readingTime} min read
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={onToggleBookmark} className={`p-1.5 rounded-lg transition-colors ${isBookmarked ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`} title="Bookmark">
              <Bookmark size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>
            <button onClick={handlePrint} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors" title="Print">
              <Printer size={14} />
            </button>
            <button onClick={handleDownload} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors" title="Download">
              <Download size={14} />
            </button>
            <button
              onClick={onToggleExpand}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-dark-700 hover:bg-dark-600 text-xs font-medium text-gray-200 transition-colors"
            >
              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
            <button
              onClick={onMarkRead}
              disabled={isRead}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isRead ? 'bg-green-600/20 text-green-400 cursor-default' : 'bg-brand-500 text-white hover:bg-brand-400'}`}
            >
              <Check size={13} />
              {isRead ? 'Read' : 'Mark as Read'}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div ref={contentRef} className="px-5 pb-5">
              <div className="border-t border-white/5 pt-5">
                <h2 className="text-lg font-bold text-white mb-4">Chapter {chapter.id}</h2>
                <h3 className="text-base font-semibold text-brand-400 mb-5">{chapter.title}</h3>
                <div className="text-sm text-gray-300 leading-7 whitespace-pre-wrap font-light">
                  {renderContent(chapter.content)}
                </div>

                {/* Key Takeaway */}
                <div className="mt-6 border-t border-white/10 pt-4">
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-brand-500/10 border border-brand-500/20">
                    <CheckCircle2 size={15} className="text-brand-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-400 mb-1">Key Takeaway</p>
                      <p className="text-sm text-gray-200 italic">{chapter.keyTakeaway}</p>
                    </div>
                  </div>
                </div>

                {/* Prev / Next */}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    onClick={onPrev}
                    disabled={chapter.id === 1}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-dark-700 hover:bg-dark-600 text-xs font-medium text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowLeft size={13} /> Previous Chapter
                  </button>
                  <span className="text-[10px] text-gray-500">{chapter.id} / {TOTAL_CHAPTERS}</span>
                  <button
                    onClick={onNext}
                    disabled={chapter.id === TOTAL_CHAPTERS}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-dark-700 hover:bg-dark-600 text-xs font-medium text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
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

// ─── MAIN PLAYBOOK COMPONENT ───────────────────────────────────────────────────
export default function Playbook() {
  const [readIds, setReadIds] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const chapterRefs = useRef({});

  // Auto-expand chapter from URL param (e.g. /playbook?chapter=3)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ch = parseInt(params.get('chapter'));
    if (ch && ch >= 1 && ch <= TOTAL_CHAPTERS) {
      setExpandedIds([ch]);
      setTimeout(() => chapterRefs.current[ch]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
  }, []);

  // Load progress from backend on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/playbook/builder-progress');
        const completed = res.data.map(c => parseInt(c.chapterId.replace('builder-ch-', '')));
        setReadIds(completed);
      } catch {
        // fallback to localStorage
        try {
          const saved = JSON.parse(localStorage.getItem('builder-playbook-read') || '[]');
          setReadIds(saved);
        } catch { /* empty */ }
      }
      try {
        const bm = JSON.parse(localStorage.getItem('builder-playbook-bookmarks') || '[]');
        setBookmarkedIds(bm);
      } catch { /* empty */ }
      setLoading(false);
    };
    load();
  }, []);

  // Keyboard navigation: Ctrl+→ next expanded, Ctrl+← prev expanded
  useEffect(() => {
    const handler = (e) => {
      if (!e.ctrlKey) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const visibleIds = filteredChapters.map(c => c.id);
        if (expandedIds.length === 0) {
          if (visibleIds.length > 0) toggleExpand(visibleIds[0]);
          return;
        }
        const lastExpanded = expandedIds[expandedIds.length - 1];
        const idx = visibleIds.indexOf(lastExpanded);
        if (e.key === 'ArrowRight' && idx < visibleIds.length - 1) {
          const nextId = visibleIds[idx + 1];
          toggleExpand(nextId);
          scrollToChapter(nextId);
        } else if (e.key === 'ArrowLeft' && idx > 0) {
          const prevId = visibleIds[idx - 1];
          toggleExpand(prevId);
          scrollToChapter(prevId);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [expandedIds]);

  const scrollToChapter = (id) => {
    setTimeout(() => {
      chapterRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const toggleExpand = useCallback((id) => {
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const markRead = async (id) => {
    if (readIds.includes(id)) return;
    const next = [...readIds, id];
    setReadIds(next);
    localStorage.setItem('builder-playbook-read', JSON.stringify(next));
    try {
      await api.post(`/playbook/builder-complete/${id}`);
      window.dispatchEvent(new CustomEvent('xp:update', { detail: { xpGain: XP_PER_CHAPTER } }));
      toast.success(`+${XP_PER_CHAPTER} XP — Chapter ${id} completed!`);
    } catch {
      toast.success(`+${XP_PER_CHAPTER} XP — Chapter ${id} marked read!`);
    }
    // auto-expand next chapter
    if (id < TOTAL_CHAPTERS) {
      const nextId = id + 1;
      setExpandedIds(prev => prev.includes(nextId) ? prev : [...prev, nextId]);
      scrollToChapter(nextId);
    }
  };

  const toggleBookmark = (id) => {
    const next = bookmarkedIds.includes(id)
      ? bookmarkedIds.filter(x => x !== id)
      : [...bookmarkedIds, id];
    setBookmarkedIds(next);
    localStorage.setItem('builder-playbook-bookmarks', JSON.stringify(next));
    toast.success(bookmarkedIds.includes(id) ? 'Bookmark removed' : 'Chapter bookmarked');
  };

  const copyPlaybook = async () => {
    try {
      await navigator.clipboard.writeText(buildFullPlaybookText());
      setCopied(true);
      toast.success('Full playbook copied to clipboard');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Copy failed');
    }
  };

  const filteredChapters = CHAPTERS.filter(ch => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      ch.title.toLowerCase().includes(q) ||
      ch.content.toLowerCase().includes(q) ||
      ch.keyTakeaway.toLowerCase().includes(q) ||
      `chapter ${ch.id}`.includes(q)
    );
  });

  const completedCount = readIds.length;
  const earnedXp = completedCount * XP_PER_CHAPTER;
  const progress = Math.round((completedCount / TOTAL_CHAPTERS) * 100);
  const allDone = completedCount === TOTAL_CHAPTERS;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">

      {/* ── HEADER ── */}
      <div className="glass-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={18} className="text-brand-400" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-400">Builder / Developer Sales Team</span>
            </div>
            <h1 className="text-xl font-bold text-white">Builder / Developer Playbook</h1>
            <p className="text-sm text-gray-400 mt-1">Complete learning guide for Builder / Developer Sales Team.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-center px-3 py-2 rounded-xl bg-dark-700 border border-white/5">
              <p className="text-xs font-bold text-white">{completedCount}/{TOTAL_CHAPTERS}</p>
              <p className="text-[10px] text-gray-500">Chapters Read</p>
            </div>
            <div className="text-center px-3 py-2 rounded-xl bg-dark-700 border border-white/5">
              <p className="text-xs font-bold text-brand-400">{earnedXp} XP</p>
              <p className="text-[10px] text-gray-500">XP Earned</p>
            </div>
            <button
              onClick={copyPlaybook}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold transition-colors"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Full Playbook'}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-gray-400">Progress</span>
            <span className="text-[11px] text-gray-400">{progress}%</span>
          </div>
          <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-purple-500"
            />
          </div>
          <p className="text-[10px] text-gray-500 mt-1.5">
            Ctrl+→ / Ctrl+← to navigate chapters • {TOTAL_XP - earnedXp} XP remaining
          </p>
        </div>
      </div>

      {/* ── COMPLETION BANNER ── */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="glass-card p-6 border border-yellow-500/30 bg-yellow-500/5 text-center"
          >
            <Trophy size={36} className="text-yellow-400 mx-auto mb-2" />
            <h2 className="text-lg font-bold text-white">🎉 Congratulations!</h2>
            <p className="text-sm text-gray-300 mt-1">Builder / Developer Playbook Completed</p>
            <p className="text-brand-400 font-bold mt-2">{TOTAL_XP} XP Earned</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SEARCH ── */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search chapters, examples, keywords..."
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            <X size={14} />
          </button>
        )}
      </div>
      {search && (
        <p className="text-xs text-gray-500 -mt-4">
          {filteredChapters.length} chapter{filteredChapters.length !== 1 ? 's' : ''} found
        </p>
      )}

      {/* ── CHAPTER CARDS ── */}
      <div className="space-y-3">
        {filteredChapters.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">No chapters match your search.</div>
        ) : (
          filteredChapters.map(ch => (
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
                onPrev={() => {
                  const prev = ch.id - 1;
                  if (prev >= 1) { toggleExpand(prev); scrollToChapter(prev); }
                }}
                onNext={() => {
                  const next = ch.id + 1;
                  if (next <= TOTAL_CHAPTERS) { toggleExpand(next); scrollToChapter(next); }
                }}
              />
            </div>
          ))
        )}
      </div>

      {/* ── BOOKMARKS SECTION ── */}
      {bookmarkedIds.length > 0 && !search && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Bookmark size={14} className="text-yellow-400" /> Bookmarked Chapters
          </h3>
          <div className="flex flex-wrap gap-2">
            {bookmarkedIds.sort((a, b) => a - b).map(id => {
              const ch = CHAPTERS.find(c => c.id === id);
              return ch ? (
                <button
                  key={id}
                  onClick={() => { toggleExpand(id); scrollToChapter(id); }}
                  className="px-3 py-1.5 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 text-xs hover:bg-yellow-400/20 transition-colors"
                >
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
