import type { FocusWorkspace, UserSettings, WorkspaceKind } from '../types/index.ts';
export const WORKSPACE_KINDS: {id: WorkspaceKind; title: string; description: string; label: string}[] = [
  {id:'learning',title:'Learning',description:'Courses, books and skills at your own pace.',label:'Subjects'},
  {id:'competitive',title:'Focused study',description:'Structured subjects and optional rankings.',label:'Subjects'},
  {id:'work',title:'Work',description:'Projects, deliverables and focused work blocks.',label:'Projects'},
  {id:'meditation',title:'Mindful time',description:'Meditation, reflection and personal routines.',label:'Practices'},
];
// Legacy records stay untouched and belong to the original space, never every space.
export function resolveWorkspaces(settings: UserSettings): FocusWorkspace[] {
  if (settings.workspaces?.length) return settings.workspaces;
  const kind = settings.focusIntent || 'learning';
  return [{id:'original-space',name:WORKSPACE_KINDS.find(k=>k.id===kind)!.title,kind,createdAt:0,activeSubjectId:settings.activeSubjectId,dailyGoalHours:settings.dailyGoalHours,weeklyTargetHours:settings.weeklyTargetHours,rankingOptIn:!!settings.rankingOptIn}];
}
export function activeWorkspace(settings: UserSettings): FocusWorkspace {
  const spaces=resolveWorkspaces(settings);
  return spaces.find(s=>s.id===settings.activeWorkspaceId&&!s.archived)||spaces.find(s=>!s.archived)||spaces[0];
}
export function belongsToWorkspace(item: {workspaceId?: string}, id: string, legacyId: string): boolean {
  return (item.workspaceId || legacyId)===id;
}
export function workspaceSettings(settings:UserSettings,space:FocusWorkspace):UserSettings {
  return {...settings,activeWorkspaceId:space.id,focusIntent:space.kind,activeSubjectId:space.activeSubjectId,dailyGoalHours:space.dailyGoalHours??settings.dailyGoalHours,weeklyTargetHours:space.weeklyTargetHours??settings.weeklyTargetHours,rankingOptIn:space.kind==='competitive'&&!!space.rankingOptIn};
}
