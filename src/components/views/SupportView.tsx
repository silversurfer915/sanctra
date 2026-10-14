import type { AuthUser, UserSubscription } from '../../types/index.ts';
import { SupportTickets } from '../SupportTickets.tsx';
import { getCloudDatabase } from '../../utils/firebase.ts';
export function SupportView({
  user,
  enabled,
  onConnect,
  subscription,
  initialCategory,
}: {
  user: AuthUser;
  enabled: boolean;
  onConnect: () => void;
  subscription?: UserSubscription | null;
  initialCategory?: string;
}) {
  if (!getCloudDatabase()) {
    return (
      <section className="workspace-page workspace-panel empty-panel">
        <h1>A helping hand.</h1>
        <p>Connect to Sanctra to open a private support conversation and receive replies across devices.</p>
        <button className="workspace-primary" onClick={onConnect}>Connect to support</button>
      </section>
    );
  }
  return (
    <div className="workspace-page">
      {!enabled && (
        <p className="workspace-note">New tickets are temporarily paused. Existing conversations remain available.</p>
      )}
      <SupportTickets
        user={user}
        admin={false}
        allowCreate={enabled}
        subscription={subscription}
        initialCategory={initialCategory}
      />
    </div>
  );
}
