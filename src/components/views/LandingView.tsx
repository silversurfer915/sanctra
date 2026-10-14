import {useState} from 'react';
import {ArrowUpRight, ArrowRight, Check, CalendarDays, BarChart3, Users, BookOpen, Sparkles, Headphones, Plus} from 'lucide-react';
import {Brand} from '../Brand.tsx';
import {ObservatoryScene} from '../ObservatoryScene.tsx';
import {LandingFocusPreview} from './LandingFocusPreview.tsx';
import {PLUS_PRICING_PLANS} from '../../utils/subscriptionPlans.ts';
import './landing-preview.css';
import './landing.css';

interface LandingViewProps {
  activeWallpaperId?:string;
  onStartStudying:(subject?:string,minutes?:number)=>void;
  onAtmosphereChange?:(id:string)=>void;
  onOpenGroups:()=>void;
  onOpenAuth:()=>void;
}
const answers = [
  ['Can I try it without signing up?', 'Yes. Open your desk and try the timer as a guest. Sign in with Google or email when you want to save your study history, sync across devices, or join a study group.'],
  ['Can I change the timer and background?', 'Choose Pomodoro, a custom countdown, or count-up. Customize your focus intervals and breaks, choose a scenic background, and add ambient audio. The timer above uses the same dial as your study desk.'],
  ['Do I have to use JEE Track?', 'No. JEE Track is opt-in. You can use Sanctra for any subject without enabling it. If you are preparing for JEE, enable it to connect chapters, mock tests, and revision plans with your study workspace.'],
  ['How does Sanctra AI save a plan?', 'Describe what you want to study. Sanctra AI drafts a plan or study entry for you to review before saving. Usage allowances apply, and the assistant works with your recorded study activity.'],
  ['Does the calendar connect to Google Calendar?', 'Sanctra has its own study calendar with Month, Week, and Agenda views, plus calendar file import and export. It does not currently provide automatic two-way Google Calendar sync or phone push reminders.'],
];
export function LandingView({onStartStudying,onOpenGroups,onOpenAuth}:LandingViewProps) {
  const [motion,setMotion]=useState(true);
  return <div className="sanctra-landing landing-renewed">
    <ObservatoryScene paused={!motion}/>
    <a className="renewed-skip" href="#landing-main">Skip to content</a>
    <header className="renewed-header">
      <a href="#landing-main" aria-label="Sanctra home"><Brand/></a>
      <nav aria-label="Landing navigation"><a href="#your-desk">Your desk</a><a href="#study-together">Study together</a><a href="#faq">Questions</a></nav>
      <div className="renewed-header-actions"><button onClick={onOpenAuth} className="renewed-text-button">Sign in</button><button className="renewed-button renewed-header-start" onClick={()=>onStartStudying()}>Open your desk <ArrowUpRight size={18}/></button></div>
    </header>
    <main id="landing-main">
      <section className="renewed-hero" aria-labelledby="renewed-title">
        <div className="renewed-hero-copy">
          <h1 id="renewed-title">A little calm.<br/>A lot more <span>focus.</span></h1>
          <p>A quieter place to do your best work. Set your timer, make a little plan, and settle into a study space that feels like yours.</p>
          <div className="renewed-hero-actions"><button className="renewed-button renewed-button-peach" onClick={()=>onStartStudying()}>Find your focus <ArrowUpRight size={20}/></button><a className="renewed-link" href="#your-desk">Meet your desk <ArrowRight size={18}/></a></div>
          <span className="renewed-free-note"><Check size={16}/> Free to start. No credit card needed.</span>
          <div className="renewed-hero-footnote"><Headphones size={20}/><span>A timer, a little atmosphere,<br/>and room to think.</span></div>
        </div>
        <div className="renewed-timer-wrap"><LandingFocusPreview onOpenAuth={onOpenAuth} motion={motion} onToggleMotion={()=>setMotion(v=>!v)}/><p className="renewed-preview-caption">Your first focus session can start right here.</p></div>
      </section>
      <div className="renewed-page-content">
        <section id="timer" className="renewed-rhythms" aria-labelledby="rhythm-title">
          <div><h2 id="rhythm-title">Find a rhythm.<br/>Let the rest fall quiet.</h2><p>Some days need structure. Others need a little freedom. Start with the timer above, then choose the pace that suits your work.</p></div>
          <dl><div><dt>Pomodoro</dt><dd>Focus in intervals, with space for short and long breaks. Choose a preset or customize your own rhythm.</dd></div><div><dt>Countdown</dt><dd>Give a task a time limit. Set a custom duration and work toward a clear stopping point.</dd></div><div><dt>Count-up</dt><dd>Start where you are and see how long you stay. Open-ended focus, without a ticking deadline.</dd></div></dl>
        </section>
        <section id="your-desk" className="renewed-desk" aria-labelledby="desk-title">
          <div className="renewed-section-intro"><h2 id="desk-title">Less switching.<br/><span>More studying.</span></h2><p>Your day doesn’t need another collection of tabs. Keep your next task, focused time, and progress together in one place.</p><button className="renewed-link" onClick={()=>onStartStudying()}>Make yourself at home <ArrowUpRight size={18}/></button></div>
          <div className="renewed-capabilities">
            <article><CalendarDays size={24}/><div><h3>A plan you can come back to.</h3><p>Tasks, time blocks, and your calendar stay together. Keep a backlog for later and choose what matters next.</p></div></article>
            <article><BarChart3 size={24}/><div><h3>See the work adding up.</h3><p>Save sessions, look back at your study time, and follow your progress by subject, day, week, or month.</p></div></article>
            <article><Sparkles size={24}/><div><h3>A little help finding your rhythm.</h3><p>Tell Sanctra AI what your day looks like. Review its suggested plan or study entry before adding it to your records.</p></div></article>
          </div>
        </section>
        <section id="tasks" className="renewed-detail-section" aria-labelledby="planning-title"><div><h2 id="planning-title">Give your day<br/>a little direction.</h2><p>Keep dated tasks, subjects, and time blocks together. Move unfinished work into your backlog, or leave an idea unscheduled until you are ready.</p></div><div><h3>Your calendar, connected to your tasks.</h3><p>Month, Week, and Agenda views help you see study sessions alongside deadlines and events. Import or export calendar files when you need to take your plans with you.</p><h3>Your progress, connected to your time.</h3><p>Saved sessions become your study history. Look back by subject, follow daily and weekly goals, and include manually logged work in your personal records.</p></div></section>
        <section id="sanctra-ai" className="renewed-ai" aria-labelledby="ai-title"><div><Sparkles size={28}/><h2 id="ai-title">Start with your words.<br/>Leave with a plan.</h2><p>Tell Sanctra AI what you need to study and when. It can help arrange tasks, make sense of recorded progress, and draft past study entries. You review the details before anything is saved.</p></div><ul><li><q>Help me fit physics revision into tomorrow.</q><span>Turn your available time into a reviewable study plan.</span></li><li><q>What did I study this week?</q><span>Ask about the activity you have actually recorded.</span></li><li><q>I revised kinetics for an hour yesterday.</q><span>Review a suggested manual entry before saving it.</span></li></ul></section>
        <section id="study-together" className="renewed-together" aria-labelledby="together-title">
          <div className="renewed-together-symbol" aria-hidden="true"><Users size={44}/></div>
          <div><h2 id="together-title">Your own pace.<br/>A little shared momentum.</h2><p>Join a study circle, see who’s focusing, and keep the conversation alongside your group’s rankings. A place to show up together, even when you’re apart.</p></div>
          <button className="renewed-button" onClick={onOpenGroups}>Explore study groups <ArrowUpRight size={19}/></button>
        </section>
        <section id="atmosphere" className="renewed-detail-section" aria-labelledby="atmosphere-title"><div><Headphones size={28}/><h2 id="atmosphere-title">A space that feels<br/>like yours.</h2><p>Keep your favorite scenery behind your work. Choose from the background library, use supported video backgrounds, or upload an image of your own.</p></div><div><h3>A little sound. Less noise.</h3><p>Listen to ambient rain, waves, forest sounds, or noise while you study. Keep your favorite YouTube links together in Focus Audio.</p><h3>Only what you need, when you need it.</h3><p>Open the timer in full screen, or use the quieter minimal view. Background playback can be paused, and the landing scene respects reduced-motion preferences.</p></div></section>
        <section id="jee-track" className="renewed-jee" aria-labelledby="jee-title">
          <div><BookOpen size={24}/><span>Optional workspace</span></div><h2 id="jee-title">Preparing for JEE?<br/>Give your preparation a home.</h2><p>Track chapters, log mock tests, plan revisions, and connect preparation to your daily study. Enable JEE Track when you need it; your regular desk works just as well without it.</p><button className="renewed-link" onClick={()=>onStartStudying()}>Explore JEE Track from your desk <ArrowUpRight size={18}/></button>
        </section>
        <section className="renewed-membership" aria-labelledby="membership-title">
          <div><h2 id="membership-title">Start with the essentials.<br/>Make it yours over time.</h2><p>The core study desk is free. Plus+ adds expanded AI allowances and more ways to personalize your space.</p></div>
          <div className="renewed-membership-options"><div><h3>Your free desk</h3><strong className="renewed-price">₹0</strong><p>Focus timers, tasks, calendar, study history, study groups, and optional JEE Track.</p><button className="renewed-link" onClick={()=>onStartStudying()}>Start studying <ArrowRight size={17}/></button></div><div><h3>Sanctra Plus+</h3><strong className="renewed-price">₹{PLUS_PRICING_PLANS.monthly.priceInINR}<small> / month</small></strong><p>Or ₹{PLUS_PRICING_PLANS.yearly.priceInINR} per year. Expanded AI allowances, richer scenery, profile customization, and custom group codes. Activation follows payment confirmation; no automatic card charges.</p><button className="renewed-link" onClick={onOpenAuth}>Explore membership <ArrowRight size={17}/></button></div></div>
        </section>
        <section className="renewed-start" aria-labelledby="start-title"><h2 id="start-title">A simple way to begin.</h2><ol><li><strong>Open your desk.</strong><p>Try the timer as a guest. There’s no account form between you and your first session.</p></li><li><strong>Choose your rhythm.</strong><p>Pick a subject, set your timer, and turn on the atmosphere you enjoy.</p></li><li><strong>Keep your progress.</strong><p>Sign in when you’re ready to save your history and return to your workspace on another device.</p></li></ol></section>
        <section id="faq" className="renewed-faq" aria-labelledby="faq-title"><div><h2 id="faq-title">Before you settle in.</h2><p>A few things you might be wondering.</p></div><div>{answers.map(([question,answer])=><details key={question}><summary>{question}<Plus size={18}/></summary><p>{answer}</p></details>)}</div></section>
        <section className="renewed-final" aria-labelledby="final-title"><h2 id="final-title">Just you.<br/>And your next good session.</h2><button className="renewed-button renewed-button-peach" onClick={()=>onStartStudying()}>Take your seat <ArrowUpRight size={20}/></button></section>
      </div>
    </main>
    <footer className="renewed-footer"><div><Brand compact/><p>A little room to focus.</p></div><nav aria-label="Footer navigation"><a href="/pomodoro-timer/">Pomodoro timer</a><a href="/group-study-timer/">Group study timer</a><a href="/privacy/">Privacy</a><button onClick={onOpenAuth}>Sign in <ArrowUpRight size={15}/></button></nav></footer>
  </div>;
}
export default LandingView;
