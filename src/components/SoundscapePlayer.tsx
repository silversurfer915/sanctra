export {
  SoundscapeProvider,
  useSoundscape,
  SoundscapeHeaderControl,
  CenteredHiddenMusicBar,
} from './SoundscapeContext.tsx';

import { SoundscapeHeaderControl } from './SoundscapeContext.tsx';
import type { UserSubscription, TimerStatus, UserSettings } from '../types/index.ts';

interface SoundscapePlayerProps {
  subscription?: UserSubscription | null;
  timerStatus?: TimerStatus;
  userSettings?: UserSettings;
  onUpdateSettings?: (value: Partial<UserSettings>) => void;
  onOpenYouTube?: () => void;
  onOpenPlusEnquiry?: () => void;
}

/**
 * SoundscapePlayer component: renders the inline Header audio control
 * using the shared persistent SoundscapeProvider context.
 */
export function SoundscapePlayer(_props: SoundscapePlayerProps) {
  return <SoundscapeHeaderControl />;
}

export default SoundscapePlayer;
