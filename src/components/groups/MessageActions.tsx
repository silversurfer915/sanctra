import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Reply, Copy, Trash2 } from 'lucide-react';

export function MessageActions({name, canRemove, copied, onReply, onCopy, onRemove}: {
  name: string; canRemove: boolean; copied: boolean;
  onReply: () => void; onCopy: () => void; onRemove: () => void;
}) {
  const id = useId(), trigger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{left: number; top: number} | null>(null);
  const close = (restoreFocus = false) => { setPosition(null); if (restoreFocus) trigger.current?.focus({preventScroll:true}); };
  const placement = () => {
    const rect = trigger.current!.getBoundingClientRect(), height = canRemove ? 140 : 96;
    return {left: Math.max(8, Math.min(innerWidth - 184, rect.right - 176)),
      top: Math.max(8, rect.bottom + height + 6 < innerHeight ? rect.bottom + 6 : rect.top - height - 6)};
  };
  const open = () => { if (position) close(); else setPosition(placement()); };
  useEffect(() => {
    if (!position) return;
    menu.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus({preventScroll:true});
    const outside = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) close();
    };
    const reposition = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > innerHeight) { close(); return; }
      const next = placement();
      setPosition(previous => previous && (previous.top !== next.top || previous.left !== next.left) ? next : previous);
    };
    const scroll = (event: Event) => { if (!menu.current?.contains(event.target as Node)) reposition(); };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', reposition); window.addEventListener('scroll', scroll, true);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', reposition); window.removeEventListener('scroll', scroll, true); };
  }, [!!position]);
  const action = (callback: () => void) => { close(true); callback(); };
  return <>
    <button ref={trigger} type="button" className="conversation-actions-trigger" aria-label={`Message actions for ${name}`}
      title="Message actions" aria-haspopup="menu" aria-expanded={!!position} aria-controls={position ? id : undefined}
      onClick={open} onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); if (!position) open(); } }}>
      <ChevronDown size={16} aria-hidden="true" />
    </button>
    {position && createPortal(<div ref={menu} id={id} role="menu" aria-label="Message actions" className="conversation-action-menu"
      style={position} onKeyDown={e => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return; }
        if (e.key === 'Tab') { close(true); return; }
        const items = Array.from(menu.current!.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
        const current = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 :
          e.key === 'ArrowDown' ? (current + 1) % items.length : e.key === 'ArrowUp' ? (current - 1 + items.length) % items.length : -1;
        if (next >= 0) { e.preventDefault(); items[next].focus({preventScroll:true}); }
      }}>
      <button type="button" role="menuitem" onClick={() => action(onReply)}><Reply size={15} aria-hidden="true" />Reply</button>
      <button type="button" role="menuitem" onClick={() => action(onCopy)}><Copy size={15} aria-hidden="true" />{copied ? 'Copied' : 'Copy'}</button>
      {canRemove && <button type="button" role="menuitem" onClick={() => action(onRemove)}><Trash2 size={15} aria-hidden="true" />Remove</button>}
    </div>, document.getElementById('sanctra-root') || document.body)}
  </>;
}
