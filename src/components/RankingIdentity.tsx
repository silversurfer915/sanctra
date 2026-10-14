import '../features/profile/identity-layout.css';
import '../features/profile/signature-ring.css';
import {Crown,Shield} from 'lucide-react';
import {publicPlusActive,type PublicStyle} from '../utils/publicIdentity.ts';
import {VipMedia} from './VipMedia.tsx';
export function RankingBackdrop({style}:{style?:PublicStyle}){return publicPlusActive(style)?<div className={`ranking-identity-wash profile-scene-${style!.scene}`}>{style!.cover&&<VipMedia url={style!.cover} decorative className="ranking-cover"/>}</div>:null;}
export function IdentityTags({style}:{style?:PublicStyle}) {return <>{style?.admin&&<span className="admin-badge"><Shield size={12}/>Admin</span>}{publicPlusActive(style)&&<span className="plus-badge"><Crown size={12}/>{style?.trial?'Plus+ Trial':'Plus+'}</span>}</>;}
export const identityAvatarClass=(style?:PublicStyle)=>publicPlusActive(style)?'sanctra-plus-ring':'';
