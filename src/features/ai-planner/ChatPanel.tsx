import {useEffect,useRef,useState} from 'react';
import {ImagePlus,Loader2,Send,X,MessageSquare,Calendar,History} from 'lucide-react';
import type {StudySession,Subject} from '../../types/index.ts';
import type {PlannerInput,ProposalBatch,ApplyResult,ApplyReceipt,UndoResult} from './types.ts';
import {buildFullPlannerContext} from './context.ts';
import {buildStudyChatContext} from './chatContext.ts';
import {callAiGateway,aiGatewayReady} from './gateway.ts';
import {parseAssistantReply} from './assistantResponse.ts';
import {plannerErrorMessage} from './service.ts';
import {preparePlanImage,type PlanImage} from './imageAttachment.ts';
import {getLocalDateString} from '../../utils/time.ts';
import {AiMarkdown} from './AiMarkdown.tsx';
import {ChatPlanReview} from './ChatPlanReview.tsx';
import {parseManualSession} from './manualSession.ts';
import {ChatSessionReview} from './ChatSessionReview.tsx';
import './ai-planner.css';
interface Message {id:string;sender:'user'|'ai';text:string;image?:PlanImage;batch?:ProposalBatch;manualSessions?:StudySession[];savedSessionIds?:string[];savedIds?:string[]}
interface Props {
 initialInstructions?: string;
 jeeContext?: ReturnType<typeof import('../../utils/jeeAI.ts').buildJeeAIContext>;
 workspaceId?:string;
 onSaveManualSession?:(session:StudySession)=>void|Promise<void>;
 plannerInput?:PlannerInput;
 subjects:Subject[];
 sessions:StudySession[];
 onApply?:(batch:ProposalBatch,ids:string[])=>ApplyResult;
 onUndo?:(receipt:ApplyReceipt)=>UndoResult;
 onOpenTasks?:()=>void;
 send?:typeof callAiGateway;
}
const welcome=():Message=>({id:'welcome',sender:'ai',text:'Ask a question, plan your day, or log past study. You can combine requests and review everything before saving.'});
export function ChatPanel({initialInstructions,jeeContext,plannerInput,subjects,sessions,onApply,onUndo,onOpenTasks,workspaceId,onSaveManualSession,send=callAiGateway}:Props) {
 const [messages,setMessages]=useState<Message[]>([welcome()]);
 const [input,setInput]=useState('');
 const [image,setImage]=useState<PlanImage|null>(null);
 const [busy,setBusy]=useState(false);
 const [readingImage,setReadingImage]=useState(false);
 const [attachmentError,setAttachmentError]=useState('');
 const transcript=useRef<HTMLDivElement>(null),fileInput=useRef<HTMLInputElement>(null);
 const epoch=useRef(0),imageEpoch=useRef(0),inFlight=useRef(false);
 const ready=send!==callAiGateway||aiGatewayReady();
 useEffect(()=>{
  epoch.current++;imageEpoch.current++;inFlight.current=false;setBusy(false);setReadingImage(false);setMessages([welcome()]);setInput('');setImage(null);setAttachmentError('');
  return()=>{epoch.current++;imageEpoch.current++;inFlight.current=false;};
 },[plannerInput?.userId,plannerInput?.workspaceId]);
 useEffect(()=>{if(initialInstructions?.trim()){setInput(initialInstructions.slice(0,2000));}},[initialInstructions]);
 useEffect(()=>{if(transcript.current)transcript.current.scrollTop=transcript.current.scrollHeight;},[messages.length,busy]);
 const attach=async(file:File)=>{
  const request=++imageEpoch.current;setReadingImage(true);setAttachmentError('');
  try {const next=await preparePlanImage(file);if(request===imageEpoch.current)setImage(next);}
  catch(error){if(request===imageEpoch.current)setAttachmentError(error instanceof Error?error.message:'Choose another photo.');}
  finally {if(request===imageEpoch.current)setReadingImage(false);}
 };
 const submit=async()=>{
  if(inFlight.current||readingImage||!ready||(!input.trim()&&!image))return;
  const query=input.trim()||'Turn this written plan into task suggestions. Ask me about any unclear details.';
  const attachment=image;
  let context;
  try {context=plannerInput?buildFullPlannerContext({...plannerInput,instructions:query,now:new Date(),includeTasks:true,allowDeletes:true}):null;}
  catch(error){setAttachmentError(error instanceof Error?error.message:'Your workspace is unavailable.');return;}
  const current=epoch.current;inFlight.current=true;setBusy(true);setAttachmentError('');setInput('');setImage(null);
  setMessages(previous=>[...previous,{id:crypto.randomUUID(),sender:'user',text:input.trim()||(attachment?'Make a plan from this photo':query),...(attachment?{image:attachment}:{})}]);
  try {
   const study=buildStudyChatContext(getLocalDateString(),sessions,subjects,messages,true);
   const conversation=messages.filter(message=>message.id!=='welcome').slice(-6).map(message=>({role:message.sender==='user'?'user':'assistant',text:message.text,...(message.manualSessions?.length?{sessions:message.manualSessions.map(s=>({date:s.date,startTime:new Date(s.startTime).toLocaleTimeString('en-GB').slice(0,5),durationMinutes:s.durationSeconds/60,notes:s.notes,saved:!!message.savedSessionIds?.includes(s.id)}))}:{}),...(message.batch?{proposals:message.batch.proposals.map(p=>({kind:p.kind,taskId:p.taskId,draft:p.draft,saved:!!message.savedIds?.includes(p.id)}))}:{})}));
   if(context&&jeeContext)context.jeeChapters=jeeContext.syllabus.flatMap(s=>s.chapters.map(c=>({subject:s.subject,chapterId:c.id,name:c.name})));
   const raw=await send('assistant',query,{...study,...(jeeContext?{jeePreparation:jeeContext}:{}),today:getLocalDateString(),localTime:new Date().toLocaleTimeString('en-GB'),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,sessionSubjects:subjects.map(({id,name})=>({id,name})),conversation,planning:context?{...context,userId:undefined,workspaceId:undefined,legacySpaceId:undefined}:null},attachment?{mimeType:attachment.mimeType,data:attachment.data}:undefined);
   if(current!==epoch.current)return;
   const envelope=JSON.parse(raw);
   if(envelope.sessions!==undefined&&(!Array.isArray(envelope.sessions)||envelope.sessions.length>10))throw new Error('AI returned unsupported sessions.');
   const drafts=(envelope.sessions||[]) as unknown[];
   if(drafts.length&&(!workspaceId||!onSaveManualSession))throw new Error('Sign in to a workspace to log sessions.');
   const manualSessions=drafts.map(session=>parseManualSession(JSON.stringify({question:null,session}),{now:new Date(),subjects,workspaceId:workspaceId!,jeeChapters:context?.jeeChapters}).session!).filter(Boolean);
   // Even chat-only replies must use the checked envelope; no raw JSON enters the transcript.
   if(!context){const value=JSON.parse(raw);if(typeof value.reply!=='string'||value.plan!==null)throw new Error('Sign in to a workspace to add tasks.');setMessages(previous=>[...previous,{id:crypto.randomUUID(),sender:'ai',text:value.reply,manualSessions}]);}
   else {
    const result=parseAssistantReply(raw,context,{batchId:crypto.randomUUID(),proposalIds:Array.from({length:30},()=>crypto.randomUUID())});
    if(!result.ok)throw new Error(result.issues.map(issue=>issue.message).join(' '));
    setMessages(previous=>[...previous,{id:crypto.randomUUID(),sender:'ai',text:result.batch?.question||result.text||'Review your proposals below.',manualSessions,...(result.batch&&!result.batch.question&&result.batch.proposals.length?{batch:result.batch}:{})}]);
   }
  }catch(error){
   if(current!==epoch.current)return;
   const text=error instanceof Error&&/allowance|messages|Reconnect|resets|task|reply|plan|workspace/i.test(error.message)?error.message:plannerErrorMessage(error);
   setMessages(previous=>[...previous,{id:crypto.randomUUID(),sender:'ai',text}]);setInput(input);setImage(attachment);
  }finally {if(current===epoch.current){inFlight.current=false;setBusy(false);}}
 };
 return <div className="ai-chat">
  <div ref={transcript} className="ai-chat-transcript" aria-label="AI conversation">
   {messages.map(message=><div key={message.id} className={`ai-chat-message ai-chat-${message.sender}`}>
    <div className="ai-chat-message-content">
     <div className="ai-chat-bubble conversation-bubble">
      {message.image&&<img className="ai-chat-photo" src={message.image.preview} alt="Your attached written plan"/>}
      {message.sender==='ai'?<AiMarkdown text={message.text}/>:message.text}
     </div>
     {message.batch&&onApply&&onUndo&&onOpenTasks&&<ChatPlanReview batch={message.batch} onApply={onApply} onUndo={onUndo} onOpenTasks={onOpenTasks} onChange={(batch,savedIds)=>setMessages(previous=>previous.map(item=>item.id===message.id?{...item,batch,savedIds}:item))}/>}
     {message.manualSessions?.map(session=>onSaveManualSession&&<ChatSessionReview jeeChapters={message.batch?.context.jeeChapters||jeeContext?.syllabus.flatMap(s=>s.chapters.map(c=>({subject:s.subject,chapterId:c.id,name:c.name})))} key={session.id} session={session} subjects={subjects} onSave={onSaveManualSession} onSaved={draft=>setMessages(previous=>previous.map(item=>item.id===message.id?{...item,manualSessions:item.manualSessions?.map(s=>s.id===draft.id?draft:s),savedSessionIds:[...(item.savedSessionIds||[]),draft.id]}:item))}/>)}
    </div>
   </div>)}
   {busy&&<div className="ai-chat-thinking" role="status"><Loader2 size={15} className="animate-spin"/>Thinking…</div>}
  </div>
  {!ready&&<p className="ai-connection-note">AI is waiting for its connection to be configured.</p>}
  {attachmentError&&<p role="alert" className="ai-plan-error">{attachmentError}</p>}
  {image&&<div className="ai-chat-attachment"><img src={image.preview} alt="Attached plan preview"/><span><strong>Plan photo</strong><small>{image.name}</small></span><button type="button" aria-label="Remove plan photo" onClick={()=>{imageEpoch.current++;setImage(null);}}><X size={16}/></button></div>}
  <div className="ai-chat-shortcuts" aria-label="Start a request">
   {[{label:'Ask',icon:MessageSquare,text:'How is my study progress this week?'},{label:'Plan',icon:Calendar,text:'Plan my day: '},...(onSaveManualSession?[{label:'Log session',icon:History,text:'Log my past study: '}]:[])].map(({label,icon:Icon,text})=><button type="button" className="analytics-button" key={label} disabled={busy} onClick={()=>{setInput(text);transcript.current?.parentElement?.querySelector<HTMLTextAreaElement>('textarea')?.focus();}}><Icon size={15}/>{label}</button>)}
  </div>
  <form onSubmit={event=>{event.preventDefault();void submit();}} className="ai-chat-composer glass-card">
   <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="ai-chat-file" aria-label="Upload a plan photo" tabIndex={-1} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void attach(file);}}/>
   <button type="button" className="ai-chat-attach" aria-label="Attach a plan photo" title="Attach a handwritten or printed plan" disabled={busy||readingImage} onClick={()=>fileInput.current?.click()}>{readingImage?<Loader2 size={19} className="animate-spin"/>:<ImagePlus size={19}/>}</button>
   <textarea aria-label="Message Sanctra AI" rows={2} maxLength={2000} value={input} onChange={event=>setInput(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();void submit();}}} placeholder="Ask, plan your day, or describe past study…" disabled={busy} className="ai-chat-input"/>
   <button type="submit" aria-label="Send message to AI" disabled={(!input.trim()&&!image)||busy||readingImage||!ready} className="ai-chat-send workspace-primary"><Send size={18}/></button>
  </form>
  <small className="ai-chat-keyhint">Enter to send · Photos are sent to Gemini with your message</small>
 </div>;
}
