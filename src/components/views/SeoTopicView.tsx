import {type CSSProperties} from 'react';
import {ArrowRight, Clock3, Users} from 'lucide-react';
import {Brand} from '../Brand.tsx';
import './seo-topic.css';

type Topic = 'pomodoro' | 'group';

const pages = {
 pomodoro: {
  title: 'An online Pomodoro timer made for study.',
  intro: 'Choose a familiar 25/5 rhythm, a longer 50/10 session or your own focus and break lengths. Sanctra keeps the timer beside your subjects, tasks and study history in one calm workspace.',
  image: '/backgrounds/landing-sunlit-sanctuary-v1.webp',
  sections: [
   ['A Pomodoro timer that fits the work', 'Short sessions can make starting easier; longer sessions leave more room for reading, problem sets and revision. Sanctra lets you set focus length, short break, long break and how many sessions come before the long break. You can also use count-up or a custom countdown when Pomodoro is not the right shape for the task.'],
   ['Keep the session connected to your plan', 'Choose a subject or focus on a scheduled task before you begin. When you save a completed live session, it becomes part of your personal history and analytics. Tasks, calendar events and older backlog items remain available around the timer instead of living in separate tabs.'],
   ['A quieter place to stay with the timer', 'Fullscreen focus mode reduces the interface to the clock and compact controls. Scenic backgrounds, built-in soundscapes and saved YouTube ambience are optional. Reduced-motion settings are respected, and the timer can continue through ordinary background use when strict mode is off.'],
  ],
  faqs: [
   ['What is the Pomodoro technique?', 'It is a focus rhythm built from timed work intervals and breaks. A common starting point is 25 minutes of focus followed by a 5-minute break, with a longer break after several sessions.'],
   ['Can I change the 25/5 timer?', 'Yes. Sanctra includes familiar presets and lets you save your own focus, short-break, long-break and sessions-before-long-break values.'],
   ['Does the timer work for longer study sessions?', 'Yes. You can use a 50/10 or 90/20 rhythm, create custom durations, run a countdown or count upward without a fixed end time.'],
   ['Do I need an account?', 'The public page includes an interactive example. Sign in with Google or email to use your study desk and save sessions, tasks and settings.'],
  ],
  relatedHref: '/group-study-timer/',
  relatedLabel: 'Study with friends using Sanctra groups',
 },
 group: {
  title: 'A group study timer for quiet accountability.',
  intro: 'Create a public or private study group, invite friends with a code and see who is focusing. Everyone keeps control of their own timer while the group shares presence, recorded study time and conversation.',
  image: '/backgrounds/landing-starlit-observatory-v1.webp',
  sections: [
   ['Study with friends without a video call', 'Sanctra groups are designed for quiet company. Members run their own Pomodoro, countdown or count-up timer and can see when others are focusing. There is no shared camera or microphone to manage, so the group can stay present without becoming another meeting.'],
   ['Private rooms, public groups and invitations', 'Create a public group that other students can discover or a private group for people you invite. Invitation codes make it easy to bring classmates or an accountability partner into the same space. You can belong to several groups and choose a primary focus circle.'],
   ['Conversation and study-time rankings', 'Group conversations support replies, images and mentions. Daily, weekly and monthly leaderboards compare eligible recorded study time, while the Inbox collects mentions. Personal study history and competitive ranking credit remain separate.'],
  ],
  faqs: [
   ['Is the group timer synchronized for everyone?', 'No. Each member controls their own timer. The group shows presence, study status and recorded time rather than forcing everyone onto one shared clock.'],
   ['Can I make a private study group?', 'Yes. Create a private group and share its invitation code with the people you want to join.'],
   ['Can friends see what I am studying?', 'Group members can see the study presence and group information Sanctra displays. Private personal history and account details are not turned into a public group log.'],
   ['Does Sanctra have group chat?', 'Yes. Group conversations support messages, replies, images and mentions, with mention notices delivered to the Inbox.'],
  ],
  relatedHref: '/pomodoro-timer/',
  relatedLabel: 'Explore the custom Pomodoro timer',
 },
} as const;

export function SeoTopicView({topic}:{topic:Topic}) {
 const page=pages[topic], Icon=topic==='pomodoro'?Clock3:Users;
 return <div className="sanctra-landing landing-editorial seo-topic" style={{'--landing-scene':`url("${page.image}")`} as CSSProperties}>
  <a className="skip-link" href="#topic-main">Skip to content</a>
  <header className="landing-header"><a href="/" aria-label="Sanctra home"><Brand/></a><nav aria-label="Public pages"><a href="/pomodoro-timer/">Pomodoro timer</a><a href="/group-study-timer/">Group study timer</a><a href="/#sanctra-ai">Sanctra AI</a></nav><a className="landing-button small" href="/">Open Sanctra <ArrowRight size={16}/></a></header>
  <main id="topic-main">
   <section className="seo-topic-hero"><div className="seo-topic-photo" aria-hidden="true"><img src={page.image} alt="" fetchPriority="high"/></div><div className="seo-topic-shade"/><div className="seo-topic-copy"><Icon size={28} strokeWidth={1.5}/><h1>{page.title}</h1><p>{page.intro}</p><a className="landing-button" href="/">Open your study desk <ArrowRight size={18}/></a></div></section>
   <section className="seo-topic-body" aria-label="About this Sanctra feature">{page.sections.map(([heading,body])=><article key={heading}><h2>{heading}</h2><p>{body}</p></article>)}</section>
   <section className="seo-topic-faq"><h2>Questions students ask</h2><div className="landing-native-faq">{page.faqs.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
   <aside className="seo-topic-related"><p>There is more to your study desk.</p><a href={page.relatedHref}>{page.relatedLabel} <ArrowRight size={17}/></a></aside>
  </main>
  <footer className="landing-footer"><Brand compact/><a href="/">Sanctra home</a><a href="/pomodoro-timer/">Pomodoro timer</a><a href="/group-study-timer/">Group study timer</a><a href="/privacy">Privacy</a></footer>
 </div>;
}
