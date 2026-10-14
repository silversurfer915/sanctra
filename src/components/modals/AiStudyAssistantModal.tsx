import {AiAllowance} from '../AiAllowance.tsx';
import {ChatPanel} from '../../features/ai-planner/ChatPanel.tsx';
import type { PlannerInput, ProposalBatch, ApplyResult, ApplyReceipt, UndoResult } from '../../features/ai-planner/types.ts';
import React, { useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
} from 'lucide-react';
import type { Subject, TaskItem, StudySession } from '../../types/index.ts';

interface AiStudyAssistantModalProps {
  jeeContext?:ReturnType<typeof import('../../utils/jeeAI.ts').buildJeeAIContext>;
  initialInstructions?:string;
  onSaveManualSession?: (session: StudySession) => void;
  plus?: boolean;
  plannerInput?: PlannerInput;
  onApplyPlan?: (batch: ProposalBatch, ids: string[]) => ApplyResult;
  onUndoPlan?: (receipt: ApplyReceipt) => UndoResult;
  onOpenTasks?: () => void;
  isOpen: boolean;
  onClose: () => void;
  subjects?: Subject[];
  workspaceId?: string;
  sessions?: StudySession[];
  onTasksUpdated?: (allTasks: TaskItem[]) => void;
}


export const AiStudyAssistantModal: React.FC<AiStudyAssistantModalProps> = ({
  jeeContext,initialInstructions,
  onSaveManualSession, workspaceId, plannerInput, onApplyPlan, onUndoPlan, onOpenTasks, plus=false,
  isOpen,
  onClose,
  subjects = [],
  sessions = [],
}) => {

  const drawerRef = useRef<HTMLElement>(null);
  const closeRef=useRef(onClose);closeRef.current=onClose;
  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    drawerRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if(e.key==='Tab'){const controls=[...drawerRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled)')||[]].filter(el=>el.offsetParent!==null);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
      if (e.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {window.removeEventListener('keydown', handleKeyDown);previous?.focus();};
  }, [isOpen]);

  return (
    <div className="ai-study-overlay" style={{display:isOpen?undefined:'none'}} aria-hidden={!isOpen} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <section ref={drawerRef} className="ai-study-drawer glass-modal" role="dialog" aria-modal="true" aria-labelledby="ai-study-title">
        {/* Header */}
        <div className="ai-study-header flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="ai-study-mark">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="ai-study-title" className="text-base font-semibold text-white flex items-center gap-2">
                Sanctra AI

              </h2>
              <p className="text-xs text-slate-400">Plans, past sessions and your progress.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close AI study helper"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        {plannerInput?.userId&&<AiAllowance uid={plannerInput.userId} plus={plus} active={isOpen}/>}
        <div className="ai-study-body ai-study-chat-body flex-1 overflow-y-auto p-5">
          <ChatPanel jeeContext={jeeContext} initialInstructions={initialInstructions} plannerInput={plannerInput} subjects={subjects} sessions={sessions} onApply={onApplyPlan} onUndo={onUndoPlan} onOpenTasks={onOpenTasks} workspaceId={workspaceId} onSaveManualSession={onSaveManualSession}/>
        </div>
      </section>
    </div>
  );
};

export default AiStudyAssistantModal;
