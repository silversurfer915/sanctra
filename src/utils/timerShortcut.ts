export function canToggleTimerShortcut(event: { code: string; repeat: boolean; interactive: boolean; dialogOpen: boolean }): boolean {
  return event.code === 'Space' && !event.repeat && !event.interactive && !event.dialogOpen;
}
