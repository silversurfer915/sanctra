import {ImageAttachmentInput,AttachedImage} from './ImageAttachmentInput.tsx';
import type {ImageAttachment} from '../utils/imageAttachments.ts';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Bug, MessageSquare, Lightbulb, UserRound, Shield, Clock, Handshake, Crown, Send, CheckCircle, Sparkles } from 'lucide-react';
import type { AuthUser, UserSubscription, SubscriptionTier } from '../types/index.ts';
import { cloudErrorMessage } from '../utils/cloudErrors.ts';
import './support.css';
import { supportCategories, buildSupportMessage, supportStatusLabel } from '../utils/supportForms.ts';
import { isEntitlementActive } from '../utils/subscriptionPlans.ts';
import {
  subscribeTickets,
  subscribeTicketMessages,
  createTicket,
  replyTicket,
  setTicketStatus,
  grantUserSubscription,
  revokeUserSubscription,
  subscribeSubscriptions,
  type Ticket,
  type TicketMessage,
} from '../utils/adminService.ts';

const legacyTopics = [
  { id: 'report', label: 'Community concern', detail: 'Report a member or a group privately.', Icon: Shield },
  { id: 'question', label: 'A little guidance', detail: 'Questions about focus tools and features.', Icon: MessageSquare },
  { id: 'partnership', label: 'Work together', detail: 'Communities, creators and collaboration.', Icon: Handshake },
];

const topicIcons = {issue:Bug,suggestion:Lightbulb,account:UserRound,timer:Clock,appeal:Shield,other:MessageSquare,premium:Crown};
const topics = [...supportCategories.map(t=>({...t,Icon:topicIcons[t.id as keyof typeof topicIcons]})),...legacyTopics];

export function SupportTickets({
  user,
  admin,
  allowCreate = true,
  subscription = null,
  initialCategory,
  initialTicketId,
  inbox = false,
}: {
  user: AuthUser;
  admin: boolean;
  allowCreate?: boolean;
  subscription?: UserSubscription | null;
  initialCategory?: string;
  initialTicketId?: string;
  inbox?: boolean;
}) {
  const [image,setImage]=useState<ImageAttachment|null>(null);
  const [replyImage,setReplyImage]=useState<ImageAttachment|null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<string | null>(initialTicketId || null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [compose, setCompose] = useState(initialCategory === 'premium');
  const [title, setTitle] = useState(initialCategory === 'premium' ? 'Sanctra Plus+ purchase request' : '');
  const [category, setCategory] = useState(initialCategory || 'issue');
  const [text, setText] = useState('');
  const [fields,setFields]=useState<Record<string,string>>(initialCategory==='premium'?{plan:'Help me choose'}:{});
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [ticketPageSize, setTicketPageSize] = useState<number>(25);
  const [loading, setLoading] = useState(true);

  // Admin quick saved replies
  const SAVED_REPLIES = [
    {
      label: 'Plus Details & Activation',
      content: 'Thank you for reaching out! Sanctra Plus+ is available for your account at ₹99 for year one (Early Believer offer), ₹159/year standard, or ₹59/month. Once you confirm your preferred plan, we can activate your subscription directly on your account.',
    },
    {
      label: 'Under Investigation',
      content: 'Thank you for reporting this issue. We have logged this with our engineering team and are actively investigating. We will update you here as soon as a fix is live.',
    },
    {
      label: 'Suggestion Received',
      content: 'Thank you for this thoughtful idea! Community feedback directly shapes our roadmap. We have recorded your suggestions for upcoming releases.',
    },
    {
      label: 'Marking Resolved',
      content: 'We are closing this ticket as resolved. If you need any further help, feel free to reply and reopen this conversation anytime.',
    },
  ];

  // Admin subscription inspection and manual granting
  const [subscriptions, setSubscriptions] = useState<Record<string, UserSubscription>>({});
  const [grantTier, setGrantTier] = useState<SubscriptionTier>('early_yearly');
  const [grantSuccess, setGrantSuccess] = useState('');

  useEffect(() => {
    setLoading(true);
    try {
      return subscribeTickets(
        user.uid,
        admin,
        (v) => {
          setTickets(v);
          setLoading(false);
        },
        (e) => {
          setError(e);
          setLoading(false);
        }
      );
    } catch {
      setLoading(false);
      setError('Connect your account to open support tickets.');
    }
  }, [user.uid, admin]);

  useEffect(() => {
    if (!admin) return;
    try {return subscribeSubscriptions(setSubscriptions, setError);} catch {setError('Membership details could not be loaded.');}
  }, [admin]);

  useEffect(() => {
    setMessages([]);
    return selected ? subscribeTicketMessages(selected, setMessages, setError) : undefined;
  }, [selected]);

  const ticket = tickets.find((t) => t.id === selected);
  const visible = tickets
    .filter((t) => tab === 'all' || t.status === tab)
    .filter((t) => categoryFilter === 'all' || t.category === categoryFilter)
    .filter((t) => `${t.title} ${t.ownerName} ${t.category}`.toLowerCase().includes(search.toLowerCase()));

  const perform = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setGrantSuccess('');
    try {
      await action();
    } catch (e) {
      setError(cloudErrorMessage(e,'save this support action'));
    } finally {
      setBusy(false);
    }
  };

  const handleOpenCompose = (catId: string) => {
    setCategory(catId);setFields(catId==='premium'?{plan:'Help me choose'}:{});setError('');
    if (catId === 'premium') {
      setTitle('Sanctra Plus+ purchase request');
      setText('');
    } else {
      setTitle('');
      setText('');
    }
    setSelected(null);setImage(null);
    setCompose(true);
  };

  const formTopic = supportCategories.find(t=>t.id===category);
  const currentMemberSub = ticket ? subscriptions[ticket.ownerUid] : null;

  return (
    <section className={`support-workspace ${compose ? 'is-composing' : ''}`}>
      <header className="workspace-heading">
        <div>
          <h1>{admin ? 'Support desk' : inbox ? 'Support tickets' : compose ? 'Create a support ticket' : 'How can we help?'}</h1>
          <p>{admin ? 'Review requests, reply privately and keep members updated.' : inbox ? 'Read team replies, follow their status and continue the conversation.' : compose ? 'Tell us what you need. Follow the conversation in your inbox.' : 'Choose a topic to reach the right support conversation.'}</p>
        </div>
        {!admin && allowCreate && !inbox && !compose && !ticket && (
          <button className="workspace-primary" onClick={() => {setCompose(false);setSelected(null);document.getElementById('support-categories')?.scrollIntoView({behavior:'smooth'});}}>
            New ticket
          </button>
        )}
      </header>

      {error && <p role="alert" className="workspace-note">{error}</p>}
      {grantSuccess && <p role="status" className="workspace-note text-amber-200">{grantSuccess}</p>}

      {ticket ? (
        <article className="workspace-panel ticket-conversation">
          <div className="workspace-heading">
            <button className="analytics-button" onClick={() => { setSelected(null); setReply(''); setGrantSuccess(''); setError(''); }}>
              <ArrowLeft size={16} /> All tickets
            </button>
            <div className="flex items-center gap-2">
              {ticket.isPriority && (
                <span className="plus-badge"><Crown size={12} />Priority queue</span>
              )}
              <span className={`profile-status support-status status-${ticket.status}`}>{supportStatusLabel(ticket.status)}</span>
              {admin && <label className="support-status-control">Status<select className="inbox-input" aria-label="Ticket status" value={ticket.status} disabled={busy} onChange={e=>void perform(()=>setTicketStatus(ticket.id,e.target.value as Ticket['status']))}>{(['open','in_progress','resolved'] as const).map(status=><option key={status} value={status}>{supportStatusLabel(status)}</option>)}</select></label>}
            </div>
          </div>

          <p className="workspace-eyebrow">
            #{ticket.id.slice(0, 8)} · {topics.find((t) => t.id === ticket.category)?.label || ticket.category}
          </p>
          <h2>{ticket.title}</h2>
          <p>{ticket.ownerName} · Opened {ticket.createdAt?.toDate().toLocaleDateString() || 'just now'}</p>

          {/* Admin quick subscription management banner for this member */}
          {admin && (
            <div className="border border-purple-500/25 rounded-2xl p-4 my-4 bg-purple-500/[0.04] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-400" />
                  <strong className="text-sm font-semibold text-purple-200">Sanctra Plus+ Subscription Control</strong>
                </div>
                {isEntitlementActive(currentMemberSub || null) ? (
                  <span className="plus-badge">
                    <Crown size={12} />
                    Active ({currentMemberSub?.tier === 'early_yearly' ? 'Early Backer' : currentMemberSub?.tier === 'yearly' ? 'Annual' : 'Monthly'}) · Expires {new Date(currentMemberSub!.currentPeriodEnd).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Standard member</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {(
                  <>
                    <label className="compact-field text-xs text-slate-300">
                      <span>Tier:</span>
                      <select
                        aria-label="Subscription plan tier"
                        className="inbox-input compact-control px-2.5"
                        value={grantTier}
                        onChange={(e) => {
                          const t = e.target.value as SubscriptionTier;
                          setGrantTier(t);
                        }}
                      >
                        <option value="early_yearly">Early Offer (₹99 · 1 Year)</option>
                        <option value="yearly">Annual Plan (₹159 · 1 Year)</option>
                        <option value="monthly">Monthly Plan (₹59 · 30 Days)</option>
                      </select>
                    </label>

                    <button
                      type="button"
                      disabled={busy}
                      className="workspace-primary compact-control px-3 inline-flex items-center gap-1.5"
                      onClick={() =>
                        void perform(async () => {
                          await grantUserSubscription(ticket.ownerUid, grantTier, ticket.id);
                          setGrantSuccess(`Sanctra Plus+ granted to ${ticket.ownerName} (${grantTier}).`);
                        })
                      }
                    >
                      <Crown size={13} /> {isEntitlementActive(currentMemberSub || null) ? 'Extend membership' : 'Activate membership'}
                    </button>
                  </>
                )}
                {isEntitlementActive(currentMemberSub || null) && (
                  <button
                    type="button"
                    disabled={busy}
                    className="analytics-button text-xs py-1.5 px-3 rounded-xl text-rose-300 hover:text-rose-200"
                    onClick={() =>
                      void perform(async () => {
                        await revokeUserSubscription(ticket.ownerUid);
                        setGrantSuccess(`Subscription revoked for ${ticket.ownerName}.`);
                      })
                    }
                  >
                    Revoke Plus+ Access
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="ticket-messages" aria-live="polite">
            {messages.map((m) => (
              <article
                key={m.id}
                className={`ticket-message ${m.senderUid === ticket.ownerUid ? 'from-member' : 'from-team'} ${m.senderUid===user.uid?'ticket-own':'ticket-other'}`}
              >
                <header>
                  <strong>{m.channel === 'agent' ? 'Hermes · Administrator' : m.senderUid === ticket.ownerUid ? m.senderName : 'Sanctra team'}</strong>
                  <small>{m.createdAt?.toDate().toLocaleString() || 'Sending…'}</small>
                </header>
                <SupportMessage text={m.text}/>{m.image&&<AttachedImage image={m.image}/>}
              </article>
            ))}
          </div>

          {ticket.status !== 'resolved' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void perform(async () => {
                  await replyTicket(ticket.id, user, reply||'Shared an image.',replyImage||undefined);
                  setReply('');setReplyImage(null);
                });
              }}
            >
              {admin && (
                <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                  <span className="text-[11px] text-slate-400 font-medium">Quick responses:</span>
                  {SAVED_REPLIES.map((sr) => (
                    <button
                      key={sr.label}
                      type="button"
                      className="analytics-button text-[11px] py-1 px-2.5"
                      onClick={() => setReply(sr.content)}
                    >
                      {sr.label}
                    </button>
                  ))}
                </div>
              )}
              <label>
                Your reply
                <textarea
                  className="inbox-input"
                  required={!replyImage}
                  maxLength={5000}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Continue the conversation…"
                />
              </label>
              <ImageAttachmentInput value={replyImage} onChange={setReplyImage} disabled={busy}/><div className="workspace-actions">
                <button className="workspace-primary" disabled={busy || (!reply.trim()&&!replyImage)}>
                  <Send size={16} />
                  {busy ? 'Sending…' : 'Send reply'}
                </button>
                <button
                  type="button"
                  className="analytics-button"
                  disabled={busy}
                  onClick={() => void perform(() => setTicketStatus(ticket.id, 'resolved'))}
                >
                  <CheckCircle size={16} />
                  Mark resolved
                </button>
              </div>
            </form>
          ) : (
            <div className="workspace-note">
              <p>This conversation is resolved. Reopen it if you need more help.</p>
              <button
                className="analytics-button"
                disabled={busy}
                onClick={() => void perform(() => setTicketStatus(ticket.id, 'open'))}
              >
                Reopen conversation
              </button>
            </div>
          )}
        </article>
      ) : (
        <>
          {!admin && allowCreate && !inbox && !compose && <>
            <div id="support-categories" className="support-topics">{supportCategories.map(t=>{const Icon=topicIcons[t.id as keyof typeof topicIcons];return <button className={`workspace-panel ${t.id==='premium'?'support-premium-topic':''}`} key={t.id} onClick={()=>handleOpenCompose(t.id)}><Icon size={22}/><div><h3>{t.label}</h3><p>{t.detail}</p></div><ArrowRight size={18}/></button>;})}</div>
            <SupportFaq items={[
              {question:'Why is my saved study data missing?',answer:'Check that you are signed into the same account and sign-in method you used before. Each account has its own study data.'},
              {question:'Why does my ranking time differ from history?',answer:'Check each session’s validation status and credited time. Manual entries, review decisions and session caps can affect ranking credit. Use Timer / session issue or Anti-cheat appeal if a session needs review.'},
              {question:'Where do I find replies?',answer:'Every ticket appears in your inbox under Support. Open it to read replies, continue the conversation and see its current status.'},
              {question:'Can I follow up on an existing issue?',answer:'Yes. Reply to your existing ticket rather than opening a duplicate. You can reopen a resolved conversation if you still need help.'},
              {question:'What should I include?',answer:'Describe the problem clearly and include the relevant date, device or session details. Never share passwords or verification codes.'},
            ]}/>

          </>}
          {compose && allowCreate && (
            <form
              className="workspace-panel ticket-compose"
              onSubmit={(e) => {
                e.preventDefault();
                void perform(async () => {
                  const details = formTopic ? buildSupportMessage(category,fields) : text||'Shared an image.';
                  const id = await createTicket(user, title, category, details, isEntitlementActive(subscription),image||undefined);
                  setSelected(id);
                  setCompose(false);
                  setTitle('');
                  setText('');setImage(null);
                });
              }}
            >
              <div className="workspace-heading">
                <button type="button" className="analytics-button support-change-category" onClick={() => setCompose(false)}><ArrowLeft size={15}/>Change category</button>
                <span className="support-category-label">{category==='premium'&&<Crown size={16}/>} {topics.find(t=>t.id===category)?.label}</span>
              </div>
              <p className="support-form-description">{topics.find(t=>t.id===category)?.detail}</p>
              {formTopic && <SupportFaq items={formTopic.faq} embedded/>}
              <label>A short title<input className="inbox-input" required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Summarise your request"/></label>
              {formTopic ? formTopic.fields.map(field=><label key={field.id}>{field.label}{field.optional && <span className="support-optional"> · optional</span>}{field.options ? <select className="inbox-input" required value={fields[field.id]||''} onChange={e=>setFields(v=>({...v,[field.id]:e.target.value}))}><option value="" disabled>Choose a plan</option>{field.options.map(option=><option key={option} value={option}>{option}</option>)}</select> : field.input ? <input type={field.id==='screenshot'?'url':'text'} className="inbox-input" required={!field.optional} maxLength={field.id==='screenshot'?1000:500} value={fields[field.id]||''} placeholder={field.hint} onChange={e=>setFields(v=>({...v,[field.id]:e.target.value}))}/> : <textarea className="inbox-input" required={!field.optional} rows={3} maxLength={4000} value={fields[field.id]||''} placeholder={field.hint} onChange={e=>setFields(v=>({...v,[field.id]:e.target.value}))}/>}</label>) : <label>Details<textarea className="inbox-input" rows={5} required={!image} maxLength={5000} value={text} onChange={e=>setText(e.target.value)}/></label>}
              <ImageAttachmentInput value={image} onChange={setImage} disabled={busy}/><p className="workspace-footnote">
                Only you and the Sanctra team can read this conversation. Please don’t include passwords.
                {isEntitlementActive(subscription) && ' As a Sanctra Plus+ member, your ticket is marked for priority care.'}
              </p>
              <button className="workspace-primary" disabled={busy || !title.trim() || (formTopic ? formTopic.fields.some(f=>!f.optional&&!fields[f.id]?.trim()) : (!text.trim()&&!image))}>
                {busy ? 'Creating…' : 'Submit ticket'}
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {!compose && (admin || inbox || tickets.length>0) && <article className="workspace-panel support-ticket-queue">
            <div className="workspace-heading">
              <h2>{admin ? 'Ticket queue' : 'Your conversations'}</h2>
              <div className="workspace-tabs">
                {(['all', 'open', 'in_progress', 'resolved'] as const).map((t) => (
                  <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
                    {t === 'all' ? 'All' : supportStatusLabel(t)} · {tickets.filter((x) => t==='all'||x.status === t).length}
                  </button>
                ))}
              </div>
            </div>

            <label className="ticket-search">
              Search conversations
              <input
                className="inbox-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Title, topic or name"
              />
            </label>

            <div className="flex flex-wrap gap-1.5 mt-3">
              <button
                type="button"
                aria-pressed={categoryFilter === 'all'}
                className="analytics-button text-xs py-1 px-2.5"
                onClick={() => setCategoryFilter('all')}
              >
                All topics ({tickets.filter((x) => tab==='all'||x.status === tab).length})
              </button>
              {topics.map((t) => {
                const count = tickets.filter((x) => (tab==='all'||x.status === tab) && x.category === t.id).length;
                if (count === 0 && categoryFilter !== t.id) return null;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={categoryFilter === t.id}
                    className="analytics-button text-xs py-1 px-2.5"
                    onClick={() => setCategoryFilter(t.id)}
                  >
                    {t.label} ({count})
                  </button>
                );
              })}
            </div>

            <div className="ticket-list mt-4">
              {loading ? (
                <p>Loading conversations…</p>
              ) : visible.length ? (
                <>
                  {visible.slice(0, ticketPageSize).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelected(t.id);setReply('');setReplyImage(null);
                        setCompose(false);
                      }}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <small>#{t.id.slice(0, 8)} · {topics.find((x) => x.id === t.category)?.label || t.category}</small>
                          {t.isPriority && (
                            <span className="plus-badge text-[10px] py-0 px-2">
                              <Crown size={10} /> Priority
                            </span>
                          )}
                        </div>
                        <strong>{t.title}</strong>
                        <p>
                          {admin ? `${t.ownerName} · ` : ''}
                          Updated {t.updatedAt?.toDate().toLocaleString() || 'just now'}
                        </p>
                      </div>
                      <span className={`support-status status-${t.status}`}>{supportStatusLabel(t.status)}</span><ArrowRight size={18} />
                    </button>
                  ))}

                  {visible.length > ticketPageSize && (
                    <div className="text-center pt-3 border-t border-slate-800/60 mt-3">
                      <button
                        type="button"
                        className="analytics-button text-xs py-1.5 px-4"
                        onClick={() => setTicketPageSize((prev) => prev + 25)}
                      >
                        Load next 25 conversations ({ticketPageSize} of {visible.length} shown)
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-panel">
                  <MessageSquare />
                  <h3>{search ? 'No matching conversations' : tab==='all'?'No tickets yet':`No ${supportStatusLabel(tab).toLowerCase()} tickets`}</h3>
                  <p>{admin ? 'Incoming requests will appear here automatically.' : 'We’re here whenever you need us.'}</p>
                </div>
              )}
            </div>
          </article>}


        </>
      )}
    </section>
  );
}

function SupportFaq({items,embedded=false}:{items:{question:string;answer:string}[];embedded?:boolean}) {
 return <section className={`support-faq ${embedded ? 'support-faq-embedded' : 'workspace-panel'}`}><h2>Before you submit</h2><p>A quick answer may be all you need.</p>{items.map(item=><details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>;
}

function SupportMessage({text}:{text:string}) {
 return <p>{text.split(/(https:\/\/[^\s]+)/g).map((part,index)=>{
  if(!part.startsWith('https://'))return part;
  try {const url=new URL(part);if(url.username||url.password)return part;return <a key={index} href={url.href} target="_blank" rel="noopener noreferrer" style={{textDecoration:'underline',textUnderlineOffset:3}}>{part}</a>;}catch{return part;}
 })}</p>;
}
