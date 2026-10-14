import {useEffect,useRef,useState} from 'react';
import {ChevronDown,Check} from 'lucide-react';
export function SelectControl({label,value,options,onChange}:{label:string;value:string;options:{value:string;label:string}[];onChange:(value:string)=>void}){
 const [open,setOpen]=useState(false);const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!open)return;const close=(event:MouseEvent)=>{if(!ref.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close);},[open]);
 return <div className="sanctra-select" ref={ref} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);ref.current?.querySelector('button')?.focus();}}}><button type="button" className="analytics-button" aria-label={label} aria-expanded={open} onClick={()=>setOpen(!open)}>{options.find(o=>o.value===value)?.label||label}<ChevronDown size={15}/></button>{open&&<div className="sanctra-select-options" role="group" aria-label={label}>{options.map(o=><button type="button" key={o.value} aria-pressed={o.value===value} onClick={()=>{onChange(o.value);setOpen(false);ref.current?.querySelector('button')?.focus();}}>{o.label}{o.value===value&&<Check size={15}/>}</button>)}</div>}</div>;
}
