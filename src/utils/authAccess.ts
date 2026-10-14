import type {AuthUser} from '../types/index.ts';
/** Reject retired local identities and anonymous sessions before opening a desk. */
export function isRegisteredAccount(value:unknown):value is AuthUser {
 if(!value||typeof value!=='object')return false;
 const user=value as Partial<AuthUser>;
 return typeof user.uid==='string'&&user.uid.length>0&&!/^(guest-|local-|google-)/.test(user.uid)&&user.isAnonymous===false
  &&[user.email,user.displayName,user.photoURL].every(v=>v===null||typeof v==='string');
}
