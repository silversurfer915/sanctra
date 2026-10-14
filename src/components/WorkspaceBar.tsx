import type { FocusWorkspace } from '../types/index.ts';
import { Layers, Settings2 } from 'lucide-react';
export function WorkspaceBar({spaces,active,onSwitch,onManage}:{spaces:FocusWorkspace[];active:FocusWorkspace;onSwitch:(id:string)=>void;onManage:()=>void}){
 return <div className="space-context-bar"><Layers size={17}/><label htmlFor="active-focus-space">Your space</label><select id="active-focus-space" value={active.id} onChange={e=>onSwitch(e.target.value)}>{spaces.filter(s=>!s.archived).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><button className="analytics-button" onClick={onManage} aria-label="Manage focus spaces"><Settings2 size={16}/><span>Manage spaces</span></button></div>;
}
