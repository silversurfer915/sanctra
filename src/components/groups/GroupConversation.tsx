import {GifPicker} from './GifPicker.tsx';
import {DEFAULT_PLATFORM_CONFIG,watchPlatformConfig} from '../../utils/platformConfig.ts';
import {MessageActions} from './MessageActions.tsx';
import {IntegrityBadge} from '../IntegrityBadge.tsx';
import {ImageAttachmentInput,AttachedImage} from '../ImageAttachmentInput.tsx';
import type {ImageAttachment} from '../../utils/imageAttachments.ts';
import {useEffect,useRef,useState} from 'react';
import {Search,Send,X,ArrowDown,MessageCircle,Smile} from 'lucide-react';
import type {AuthUser,UserSubscription} from '../../types/index.ts';
import type {GroupChatMessage} from '../../types/groups.ts';
import type {LiveGroupMember} from '../../utils/groupInsights.ts';
import {publicStyle,type PublicStyle} from '../../utils/publicIdentity.ts';
import {IdentityTags,identityAvatarClass} from '../RankingIdentity.tsx';
import {VipMedia} from '../VipMedia.tsx';
import {ChatAllowance} from '../ChatAllowance.tsx';
import {sendGroupMessage} from '../../utils/groupsService.ts';
import {removeGroupMessage} from '../../utils/liveGroups.ts';
import {splitGroupReply,canGroupChatMessages,composeGroupReply,filterGroupMessages,groupMentionUids,groupMentionParts} from '../../utils/groupConversation.ts';

export function GroupConversation({groupId,user,messages,members,ownStyle,canModerate,subscription,active}:{groupId:string;user:AuthUser;messages:GroupChatMessage[];members:LiveGroupMember[];ownStyle?:ReturnType<typeof publicStyle>;canModerate:boolean;subscription?:UserSubscription|null;active?:boolean}) {
 const [operations,setOperations]=useState(DEFAULT_PLATFORM_CONFIG);useEffect(()=>watchPlatformConfig(setOperations),[]);
 const [image,setImage]=useState<ImageAttachment|null>(null);
 const draftKey=`sanctra-chat-draft:${user.uid}:${groupId}`;
 const [draft,setDraft]=useState(()=>{try{return localStorage.getItem(draftKey)||'';}catch{return '';}});
 const [search,setSearch]=useState(''),[reply,setReply]=useState<GroupChatMessage|null>(null),[mentionRange,setMentionRange]=useState<{start:number;end:number;query:string}|null>(null),[mentionIndex,setMentionIndex]=useState(0),[sending,setSending]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(''),[remove,setRemove]=useState<GroupChatMessage|null>(null),[removing,setRemoving]=useState(false),[newCount,setNewCount]=useState(0);
 const [emojiOpen,setEmojiOpen]=useState(false),[unreadId,setUnreadId]=useState<string|null>(null);
 const unreadRef=useRef<string|null>(null),emojiControl=useRef<HTMLDivElement>(null);
 const emojis=[['😊','Smile'],['👏','Clap'],['💪','Keep going'],['🎉','Celebrate'],['✨','Sparkles'],['📚','Books'],['☕','Coffee'],['🌿','Leaf'],['💙','Blue heart'],['🙌','Well done'],['👍','Thumbs up'],['🔥','On a roll']];
 const feed=useRef<HTMLDivElement>(null),input=useRef<HTMLTextAreaElement>(null),nearBottom=useRef(true),previousIds=useRef<Set<string>|null>(null);
 useEffect(()=>{try{if(draft)localStorage.setItem(draftKey,draft);else localStorage.removeItem(draftKey);}catch{}},[draft,draftKey]);
 useEffect(()=>{const element=input.current;if(!element||active===false)return;const size=()=>{if(!element.clientWidth)return;element.style.height='auto';element.style.height=`${Math.min(140,Math.max(44,element.scrollHeight))}px`;};size();let width=element.clientWidth;const observer=new ResizeObserver(()=>{if(element.clientWidth!==width){width=element.clientWidth;size();}});observer.observe(element);return()=>observer.disconnect();},[draft,active]);
 const latest=()=>{const element=feed.current;if(element){element.scrollTop=element.scrollHeight;nearBottom.current=true;unreadRef.current=null;setNewCount(0);}};
 useEffect(()=>{
  const added=messages.filter(m=>!previousIds.current?.has(m.id)&&m.senderUid!==user.uid);
  if(!previousIds.current) {if(active!==false)latest();}
  else if(active!==false&&nearBottom.current)latest();
  else if(added.length){if(!unreadRef.current){unreadRef.current=added[0].id;setUnreadId(added[0].id);}setNewCount(n=>n+added.length);}
  previousIds.current=new Set(messages.map(m=>m.id));
 },[messages,user.uid]);
 useEffect(()=>{if(active===false)return;const raf=requestAnimationFrame(()=>{if(unreadRef.current){const element=feed.current,boundary=element?.querySelector('[data-unread-boundary]');if(element&&boundary){nearBottom.current=false;element.scrollTop+=boundary.getBoundingClientRect().top-element.getBoundingClientRect().top;}}else latest();});return()=>cancelAnimationFrame(raf);},[active]);
 useEffect(()=>{if(!emojiOpen)return;const close=(e:PointerEvent)=>{if(!emojiControl.current?.contains(e.target as Node))setEmojiOpen(false);};const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setEmojiOpen(false);emojiControl.current?.querySelector('button')?.focus();}};document.addEventListener('pointerdown',close);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',key);};},[emojiOpen]);
 const insertEmoji=(emoji:string)=>{const start=input.current?.selectionStart??draft.length,end=input.current?.selectionEnd??start;const next=draft.slice(0,start)+emoji+draft.slice(end);if(composeGroupReply(next,reply).length>200){setError('Your message is at its 200-character limit.');return;}setDraft(next);setMentionRange(null);setEmojiOpen(false);requestAnimationFrame(()=>{input.current?.focus();input.current?.setSelectionRange(start+emoji.length,start+emoji.length);});};
 useEffect(()=>{const element=feed.current;if(!element)return;const observer=new ResizeObserver(()=>{if(element.clientHeight>0&&nearBottom.current)element.scrollTop=element.scrollHeight;});observer.observe(element);return()=>observer.disconnect();},[]);
 useEffect(()=>{if(!remove)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!removing)setRemove(null);};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[remove,removing]);
 const composed=composeGroupReply(draft,reply);
 const visible=filterGroupMessages(messages,search);
 const submit=async()=>{
  if(!operations.chatEnabled){setError('Group messages are temporarily paused. Your draft is saved.');return;}
  if(image&&!operations.chatAttachmentsEnabled){setError('Chat attachments are temporarily paused. Remove the attachment to send text.');return;}
  if(sending||(!draft.trim()&&!image)||composed.length>200)return;
  setSending(true);setError('');
  const submittedDraft=draft;
  try{const mentions=groupMentionUids(composed,members);await sendGroupMessage(groupId,user,composed||'Shared an image.','chat',undefined,mentions.slice(0,20),image||undefined);setDraft(current=>current===submittedDraft?'':current);setReply(null);setImage(null);setEmojiOpen(false);nearBottom.current=true;latest();input.current?.focus();}catch(e){setError(e instanceof Error?e.message:'Message not sent. Your draft is still here.');}finally{setSending(false);}
 };
 const copy=async(message:GroupChatMessage)=>{try{await navigator.clipboard.writeText(message.text);setCopied(message.id);setError('');}catch{setError('Copy was unavailable. Select the message text to copy it.');}};
 const mentionMatches=mentionRange?members.filter(m=>m.displayName.toLocaleLowerCase().includes(mentionRange.query.toLocaleLowerCase())).slice(0,8):[];
 const mention=(member:LiveGroupMember)=>{if(!mentionRange)return;const token=`@${member.displayName} `,cursor=mentionRange.start+token.length;setDraft(previous=>previous.slice(0,mentionRange.start)+token+previous.slice(mentionRange.end));setMentionRange(null);requestAnimationFrame(()=>{input.current?.focus();input.current?.setSelectionRange(cursor,cursor);});};
 return <section className="analytics-card group-conversation">
  <header className="conversation-heading"><div><h2><MessageCircle size={20}/>Group chat</h2></div><span className="group-badge">{members.length} members</span></header>
  <label className="conversation-search"><Search size={16}/><input aria-label="Search group messages" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search recent messages or people…"/>{search&&<button aria-label="Clear message search" onClick={()=>setSearch('')}><X size={16}/></button>}</label>
  <div ref={feed} className="conversation-feed" role="log" aria-label="Group messages" aria-live="polite" onScroll={()=>{const e=feed.current;if(e){nearBottom.current=e.scrollHeight-e.scrollTop-e.clientHeight<70;if(nearBottom.current){setNewCount(0);unreadRef.current=null;}}}}>
   {!visible.length&&<div className="conversation-empty"><MessageCircle size={28}/><strong>{search?'No matching messages':'A little company goes a long way.'}</strong><p>{search?'Try another name or phrase.':'Share your focus for today or say hello.'}</p></div>}
   {visible.map((message,index)=>{
    const isMe=message.senderUid===user.uid,member=members.find(m=>m.uid===message.senderUid),style:PublicStyle|undefined=isMe?(ownStyle||member?.publicStyle):member?.publicStyle;
    const date=new Date(message.timestamp),previous=index>0?new Date(visible[index-1].timestamp):null,grouped=!search&&message.id!==unreadId&&canGroupChatMessages(visible[index-1],message);
    const content=splitGroupReply(message.text);
    return <div key={message.id}>
     {!search&&message.id===unreadId&&<div className="conversation-unread" data-unread-boundary="true"><span>New messages</span></div>}
     {(!previous||date.toDateString()!==previous.toDateString())&&<div className="conversation-day">{date.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})}</div>}
     <article className={`conversation-message ${isMe?'is-own':''} ${grouped?'is-grouped':''}`}>
      <div aria-hidden={grouped||undefined} className={`group-avatar-wrap size-sm ${identityAvatarClass(style)}`}><VipMedia className="group-avatar" url={member?.avatarUrl||message.senderAvatar} name={member?.displayName||message.senderName}/></div>
      <div className="conversation-bubble"><header><strong className="conversation-sender">{member?.displayName||message.senderName}</strong><IdentityTags style={style}/><IntegrityBadge status={member?.integrity?.integrityStatus}/><time dateTime={date.toISOString()} title={date.toLocaleString()}>{date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time></header>{content.quote&&<blockquote className="conversation-quote"><strong>{content.quote.name}</strong><span>{content.quote.text}</span></blockquote>}<p>{groupMentionParts(content.body,members).map((part,index)=>part.uid?<span key={index} className={`conversation-mention ${part.uid===user.uid?'is-you':''}`}>{part.text}</span>:<span key={index}>{part.text}</span>)}</p>{message.image&&<AttachedImage image={message.image}/>}
       <MessageActions name={member?.displayName||message.senderName} canRemove={isMe||canModerate} copied={copied===message.id} onReply={()=>{setReply(message);input.current?.focus();}} onCopy={()=>void copy(message)} onRemove={()=>setRemove(message)}/>
      </div>
     </article>
    </div>;
   })}
  </div>
  {newCount>0&&<button className="conversation-new analytics-button" onClick={latest}><ArrowDown size={15}/>{newCount} new {newCount===1?'message':'messages'}</button>}
  {!operations.chatEnabled&&<p className="conversation-paused" role="status">Messages are temporarily paused. You can still read the chat.</p>}
  <form className="conversation-composer" onSubmit={e=>{e.preventDefault();void submit();}}>
   {reply&&<div className="conversation-reply"><div><strong>Replying to {reply.senderName}</strong><p>{reply.text.slice(0,70)}</p></div><button type="button" aria-label="Cancel reply" onClick={()=>setReply(null)}><X size={16}/></button></div>}
   <div className="conversation-input-area"><textarea ref={input} aria-label="Message to group" rows={1} value={draft} maxLength={200} disabled={sending||!operations.chatEnabled} aria-autocomplete="list" aria-controls={mentionMatches.length?'group-mention-options':undefined} aria-activedescendant={mentionMatches.length?`group-mention-option-${mentionIndex}`:undefined} onChange={e=>{setDraft(e.target.value);const cursor=e.target.selectionStart,before=e.target.value.slice(0,cursor),match=/(^|\s)@([^@\n]{0,40})$/.exec(before);setMentionRange(match?{start:cursor-match[2].length-1,end:cursor,query:match[2]}:null);setMentionIndex(0);}} placeholder="Message the group… Type @ to mention." onKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(mentionMatches.length){if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setMentionIndex(i=>(i+(e.key==='ArrowDown'?1:-1)+mentionMatches.length)%mentionMatches.length);return;}if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();mention(mentionMatches[mentionIndex]||mentionMatches[0]);return;}if(e.key==='Escape'){e.preventDefault();setMentionRange(null);return;}}if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void submit();}}}/>
   <div className="conversation-tools"><div ref={emojiControl} className="conversation-emoji-control"><button type="button" className="analytics-button" aria-label="Choose emoji" aria-expanded={emojiOpen} aria-controls={emojiOpen?"group-emoji-picker":undefined} disabled={sending||!operations.chatEnabled} onClick={()=>setEmojiOpen(v=>!v)}><Smile size={19}/></button>{emojiOpen&&<div id="group-emoji-picker" className="conversation-emojis" role="group" aria-label="Emoji picker">{emojis.map(([emoji,label])=><button key={emoji} type="button" aria-label={label} onClick={()=>insertEmoji(emoji)}>{emoji}</button>)}</div>}</div><GifPicker onChange={setImage} disabled={sending||!operations.chatEnabled||!operations.chatAttachmentsEnabled}/><ImageAttachmentInput compact value={image} onChange={setImage} disabled={sending||!operations.chatEnabled||!operations.chatAttachmentsEnabled}/></div></div><div className="conversation-composer-actions"><small className={composed.length>200?'group-error':''}>{composed.length}/200 <span className="conversation-keyhint">· Shift+Enter for a new line</span></small><button type="submit" className="group-primary" disabled={sending||!operations.chatEnabled||(!draft.trim()&&!image)||composed.length>200||(!!image&&!operations.chatAttachmentsEnabled)}><Send size={16}/>{sending?'Sending…':'Send'}</button></div>
   {mentionMatches.length>0&&<div id="group-mention-options" role="listbox" className="conversation-mentions" aria-label="Member suggestions">{mentionMatches.map((m,index)=><button type="button" role="option" aria-selected={index===mentionIndex} id={`group-mention-option-${index}`} key={m.uid} onClick={()=>mention(m)}><VipMedia className="mention-suggestion-avatar" url={m.avatarUrl} name={m.displayName}/><span><strong>{m.displayName}</strong><small>{m.status==='focusing'?`Focusing${m.currentSubject?' · '+m.currentSubject:''}`:m.status==='offline'?'Offline':'In this group'}</small></span></button>)}</div>}
   {error&&<p role="alert" className="group-error">{error}</p>}
  </form>
  <span role="status" className="sr-only">{copied ? 'Message copied' : ''}</span>
  <ChatAllowance uid={user.uid} subscription={subscription}/>
  {remove&&<div className="group-modal" role="dialog" aria-modal="true" aria-label="Remove message"><section className="analytics-card p-6 space-y-4"><h2>Remove this message?</h2><p>This removes it for everyone in the group.</p><blockquote className="conversation-delete-preview">{remove.text}</blockquote>{error&&<p role="alert" className="group-error">{error}</p>}<div className="workspace-actions"><button className="analytics-button" disabled={removing} onClick={()=>setRemove(null)}>Cancel</button><button className="analytics-button group-danger" disabled={removing} onClick={async()=>{setRemoving(true);setError('');try{await removeGroupMessage(groupId,remove.id);setRemove(null);}catch(e){setError(e instanceof Error?e.message:'Unable to remove this message.');}finally{setRemoving(false);}}}>{removing?'Removing…':'Remove message'}</button></div></section></div>}
 </section>;
}
