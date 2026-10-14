import {updatePassword, type User} from 'firebase/auth';

export async function saveAccountPassword(user: User, password: string): Promise<void> {
  if (user.isAnonymous || !user.email || !user.emailVerified) throw new Error('Sign in with your verified Google account before creating a password.');
  if (password.length < 8) throw new Error('Use at least 8 characters for your password.');
  // The email is already verified on this account; setting its password keeps
  // the existing UID and Google provider without changing the account email.
  await updatePassword(user, password);
}
