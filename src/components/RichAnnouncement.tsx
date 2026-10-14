import { Fragment } from 'react';
import type { Announcement } from '../utils/inboxService.ts';
// Render a deliberately small Markdown subset as React text, never executable HTML.
function Inline({text}:{text:string}) {
 return <>{text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https:\/\/[^\s)]+\))/g).map((part,i)=>{
  if(part.startsWith('**')&&part.endsWith('**'))return <strong key={i}>{part.slice(2,-2)}</strong>;
  const link=part.match(/^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/);
  if(link)return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>;
  return <Fragment key={i}>{part}</Fragment>;
 })}</>;
}
export function RichText({text}:{text:string}) {
 const lines=text.split('\n'),blocks=[];
 for(let i=0;i<lines.length;i++){
  const line=lines[i];if(!line.trim())continue;
  if(/^#{1,3} /.test(line)){blocks.push(<h3 key={i}><Inline text={line.replace(/^#{1,3} /,'')}/></h3>);continue;}
  if(/^[-•] /.test(line)){const items=[],key=i;while(i<lines.length&&/^[-•] /.test(lines[i])){items.push(<li key={i}><Inline text={lines[i].slice(2)}/></li>);i++;}i--;blocks.push(<ul key={key}>{items}</ul>);continue;}
  if(line.startsWith('> ')){blocks.push(<blockquote key={i}><Inline text={line.slice(2)}/></blockquote>);continue;}
  blocks.push(<p key={i}><Inline text={line}/></p>);
 }
 return <div className="sanctra-prose">{blocks}</div>;
}
export function RichAnnouncement({item}:{item:Pick<Announcement,'title'|'text'|'category'|'pinned'|'coverUrl'|'actionLabel'|'actionUrl'>}){
 return <article className="announcement-story">{item.coverUrl&&<img className="announcement-cover" src={item.coverUrl} alt="" width="1200" height="600" decoding="async"/>}<div className="announcement-content"><p className="workspace-eyebrow">{item.pinned?'Pinned · ':''}{item.category||'Sanctra update'}</p><h2>{item.title}</h2><RichText text={item.text}/>{item.actionLabel&&item.actionUrl&&/^https:\/\//i.test(item.actionUrl)&&<a className="announcement-action analytics-button" href={item.actionUrl} target="_blank" rel="noopener noreferrer">{item.actionLabel}</a>}</div></article>;
}
