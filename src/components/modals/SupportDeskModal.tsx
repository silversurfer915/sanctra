import type { AuthUser } from '../../types/index.ts';
export function SupportDeskModal({isOpen,onClose}:{isOpen:boolean;currentUser:AuthUser|null;onClose:()=>void}) {
 if(!isOpen)return null;
 return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" role="dialog" aria-modal="true" aria-labelledby="support-title"><section className="glass-modal rounded-3xl p-8 max-w-lg text-center space-y-4"><p className="text-xs uppercase tracking-[.2em] text-slate-300">UNDER CONSTRUCTION</p><h2 id="support-title" className="text-2xl font-display">A better way to get help is coming.</h2><p className="text-slate-300 leading-relaxed">Support Desk is temporarily unavailable while we build private tickets and conversations with the Sanctra team.</p><button className="analytics-button mx-auto" onClick={onClose}>Back to your space</button></section></div>;
}
