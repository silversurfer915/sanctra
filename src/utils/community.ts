import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getCloudDatabase } from './firebase.ts';
import { normalizeCommunity, type CommunityPreferences } from './communityState.ts';
export {normalizeCommunity,joinCommunity,leaveCommunity,sortCommunityRooms,mergeCommunity} from './communityState.ts';
export type {CommunityPreferences} from './communityState.ts';
export function readLocalCommunity(uid: string): CommunityPreferences {
  try { const raw=localStorage.getItem(`sanctra_community_${uid}`); if(raw)return normalizeCommunity(JSON.parse(raw)); return normalizeCommunity({joinedIds:JSON.parse(localStorage.getItem(`sanctra_joined_rooms_${uid}`)||'[]')}); } catch {return normalizeCommunity();}
}
export async function loadCommunity(uid:string):Promise<CommunityPreferences> {
  const db=getCloudDatabase(); if(!db)return readLocalCommunity(uid);
  const snapshot=await getDoc(doc(db,'users',uid,'community','preferences'));
  const value=snapshot.exists()?normalizeCommunity(snapshot.data()):readLocalCommunity(uid);
  if(!snapshot.exists())await setDoc(doc(db,'users',uid,'community','preferences'),value);
  localStorage.setItem(`sanctra_community_${uid}`,JSON.stringify(value)); return value;
}
export async function saveCommunity(uid:string,value:CommunityPreferences):Promise<void> {
  const normalized=normalizeCommunity(value),db=getCloudDatabase();
  if(db)await setDoc(doc(db,'users',uid,'community','preferences'),normalized);
  localStorage.setItem(`sanctra_community_${uid}`,JSON.stringify(normalized));
  window.dispatchEvent(new Event('sanctra-community'));
}
