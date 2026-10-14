import type {UserSettings} from '../types/index.ts';
export const PROFILE_COLLECTIONS = [
 {id:'moonstone',name:'Moonstone',note:'Moonlit lake · silver light',cover:'/backgrounds/illustrated-charcoal-library.webp',avatar:'/avatars/identity-moonstone.svg',scene:'observatory',frame:'celestial-dots',aura:'celestial'},
 {id:'jade',name:'Jade Atelier',note:'Woodland calm · botanical jade',cover:'/backgrounds/illustrated-forest.v2.webp',avatar:'/avatars/identity-jade.svg',scene:'pavilion',frame:'emerald-halo',aura:'aurora'},
 {id:'solstice',name:'Solstice',note:'Golden hour · champagne detail',cover:'/backgrounds/illustrated-sand-nook.webp',avatar:'/avatars/identity-solstice.svg',scene:'cloister',frame:'golden-thread',aura:'quill'},
 {id:'rosewater',name:'Rosewater',note:'Garden terrace · rose & pearl',cover:'/backgrounds/illustrated-rose-terrace.webp',avatar:'/avatars/identity-rosewater.svg',scene:'none',frame:'obsidian-glass',aura:'lotus'},
] as const;
export function collectionSettings(id:string):Partial<UserSettings> {
 const c=PROFILE_COLLECTIONS.find(c=>c.id===id);if(!c)return {};
 return {plusAnimatedAvatarUrl:c.avatar,plusProfileCoverUrl:c.cover,plusProfileScene:c.scene,plusProfileFrame:c.frame,plusAvatarEffect:c.aura};
}
