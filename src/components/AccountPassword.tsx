import {useId, useState, type FormEvent} from 'react';
import {KeyRound} from 'lucide-react';
import {createAccountPassword, hasAccountPassword} from '../utils/firebase.ts';

export function AccountPassword() {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [hasPassword, setHasPassword] = useState(hasAccountPassword);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (password !== confirmation) {setError('The passwords do not match.'); return;}
    setBusy(true); setError(''); setSaved(false);
    try {
      await createAccountPassword(password);
      setPassword(''); setConfirmation(''); setHasPassword(true); setSaved(true); setOpen(false);
    } catch (failure) {
      const code = (failure as {code?: string}).code;
      setError(code === 'auth/user-mismatch' ? 'Choose the Google account you are signed in to.'
        : code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' ? 'Google verification was cancelled. Your password was not changed.'
        : code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use' ? 'This email already belongs to another account. Contact support before linking it.'
        : code === 'auth/weak-password' ? 'Choose a stronger password that meets the account password requirements.'
        : code === 'auth/popup-blocked' ? 'Allow the Google verification popup, then try again.'
        : code ? 'Could not save your password. Please try again.'
        : failure instanceof Error ? failure.message : 'Could not save your password. Please try again.');
    } finally {setBusy(false);}
  };
  return <section className="account-password">
    <button type="button" className="account-access-secondary" aria-expanded={open} disabled={busy} onClick={() => {setOpen(!open); setError(''); setSaved(false);}}><KeyRound size={18}/>{hasPassword ? 'Change password' : 'Create password'}</button>
    {saved && <p role="status">Password saved. You can now sign in with your email and password, or Google.</p>}
    {open && <form className="account-access-form" onSubmit={submit}>
      <p>Use the same account with Google or a password. Confirm your Google account when prompted.</p>
      <label htmlFor={`${id}-password`}>New password<input id={`${id}-password`} type="password" autoComplete="new-password" minLength={8} required disabled={busy} value={password} onChange={event => setPassword(event.target.value)}/></label>
      <label htmlFor={`${id}-confirm`}>Confirm password<input id={`${id}-confirm`} type="password" autoComplete="new-password" minLength={8} required disabled={busy} value={confirmation} onChange={event => setConfirmation(event.target.value)}/></label>
      {error && <p className="account-access-error" role="alert">{error}</p>}
      <button type="submit" className="account-access-submit" disabled={busy}>{busy ? 'Verifying and saving…' : 'Verify Google & save password'}</button>
    </form>}
  </section>;
}
