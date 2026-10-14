import type {GroupChatMessage} from '../types/groups.ts';
/** Replies use readable quoted text, compatible with existing clients and immutable messages. */
export function composeGroupReply(draft:string,reply:Pick<GroupChatMessage,'senderName'|'text'>|null):string {
 const text=draft.trim();
 if(!reply)return text;
 return `↳ ${reply.senderName.slice(0,30)}: ${reply.text.replace(/\s+/g,' ').slice(0,60)}\n${text}`;
}
export function filterGroupMessages<T extends Pick<GroupChatMessage,'text'|'senderName'>>(messages:T[],query:string):T[]{
 const needle=query.trim().toLocaleLowerCase();
 return needle?messages.filter(m=>`${m.senderName}\n${m.text}`.toLocaleLowerCase().includes(needle)):messages;
}
/** Resolve full names first so @Alex Smith does not also mention @Alex. */
export function groupMentionUids(text:string,members:{uid:string;displayName:string}[]):string[]{
 const occupied:{start:number;end:number}[]=[],uids=new Set<string>();
 for(const member of [...members].sort((a,b)=>b.displayName.length-a.displayName.length)){
  if(!member.displayName)continue;
  const token=`@${member.displayName}`;
  let start=text.indexOf(token);
  while(start>=0){
   const end=start+token.length;
   if((start===0||/\s/.test(text[start-1]))&&(end===text.length||/[\s,.!?;:]/.test(text[end]))&&!occupied.some(range=>start<range.end&&end>range.start)){
    uids.add(member.uid);occupied.push({start,end});
   }
   start=text.indexOf(token,end);
  }
 }
 return [...uids].slice(0,20);
}

/** Compact consecutive chat bubbles, without grouping system events or crossing a day. */
export function canGroupChatMessages(previous:Pick<GroupChatMessage,'senderUid'|'timestamp'|'type'>|undefined,current:Pick<GroupChatMessage,'senderUid'|'timestamp'|'type'>):boolean{
 if(!previous||previous.type!=='chat'||current.type!=='chat'||previous.senderUid!==current.senderUid)return false;
 const elapsed=current.timestamp-previous.timestamp;
 return elapsed>=0&&elapsed<5*60_000&&new Date(previous.timestamp).toDateString()===new Date(current.timestamp).toDateString();
}

/** Display the legacy reply envelope without changing stored or copied text. */
export function splitGroupReply(text:string):{quote:{name:string;text:string}|null;body:string}{
 const match=/^↳ ([^\n]{1,30}?): ([^\n]{0,60})\n([\s\S]*)$/.exec(text);
 return match?{quote:{name:match[1],text:match[2]},body:match[3]}:{quote:null,body:text};
}

/** Preserve message text while highlighting exact, longest matching member names. */
export function groupMentionParts(text:string,members:{uid:string;displayName:string}[]):{text:string;uid?:string}[]{
 const names=[...members].filter(m=>m.displayName.trim()).sort((a,b)=>b.displayName.length-a.displayName.length);
 if(!names.length)return [{text}];
 const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const regex=new RegExp(`(^|\\s)(@(?:${names.map(m=>escape(m.displayName)).join('|')}))(?=$|[\\s.,!?;:])`,'giu');
 const parts:{text:string;uid?:string}[]=[];let end=0;
 for(const match of text.matchAll(regex)){const start=match.index!+match[1].length;if(start>end)parts.push({text:text.slice(end,start)});const member=names.find(m=>`@${m.displayName}`.toLocaleLowerCase()===match[2].toLocaleLowerCase());parts.push({text:match[2],uid:member?.uid});end=start+match[2].length;}
 if(end<text.length)parts.push({text:text.slice(end)});return parts.length?parts:[{text}];
}
