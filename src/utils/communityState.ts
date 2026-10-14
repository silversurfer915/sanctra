export interface CommunityPreferences { joinedIds: string[]; primaryId: string | null; mutedIds: string[]; readIds: string[]; }
export function normalizeCommunity(value: Partial<CommunityPreferences> = {}): CommunityPreferences {
  const strings = (items: unknown) => Array.isArray(items) ? [...new Set(items.filter((s): s is string => typeof s === 'string'))].slice(0,100) : [];
  const joinedIds = strings(value.joinedIds);
  return {joinedIds, primaryId:joinedIds.includes(value.primaryId || '') ? value.primaryId! : joinedIds[0] || null, mutedIds:strings(value.mutedIds), readIds:strings(value.readIds).slice(-100)};
}
export function joinCommunity(value:CommunityPreferences,id:string):CommunityPreferences {return normalizeCommunity({...value,joinedIds:[...value.joinedIds,id]});}
export function leaveCommunity(value:CommunityPreferences,id:string):CommunityPreferences {return normalizeCommunity({...value,joinedIds:value.joinedIds.filter(v=>v!==id),mutedIds:value.mutedIds.filter(v=>v!==id)});}
export function sortCommunityRooms<T extends {id:string}>(rooms:T[],primaryId:string|null):T[] {return [...rooms].sort((a,b)=>Number(b.id===primaryId)-Number(a.id===primaryId));}
export function mergeCommunity(local:CommunityPreferences,account:CommunityPreferences):CommunityPreferences {
 return normalizeCommunity({...account,joinedIds:[...account.joinedIds,...local.joinedIds],primaryId:account.primaryId||local.primaryId,mutedIds:[...account.mutedIds,...local.mutedIds],readIds:[...account.readIds,...local.readIds].slice(-100)});
}
