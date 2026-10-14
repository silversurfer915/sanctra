import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus.ts';

export function OfflineIndicator() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-medium tracking-tight bg-[#14221f]/95 text-[#f3f1e7] border border-[#c6d7b6]/25 shadow-xl backdrop-blur-md pointer-events-none transition-all duration-300"
    >
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
      <WifiOff size={14} className="text-amber-300 shrink-0" />
      <span>Offline — showing cached data</span>
    </div>
  );
}
