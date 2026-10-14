import test from 'node:test';import assert from 'node:assert/strict';import {withPublicIdentity,publicPlusActive} from '../src/utils/publicIdentity.ts';
const member={uid:'member',displayName:'Old name',avatarUrl:'old.webp',todaySeconds:2400,status:'focusing'};
const style={plusUntil:Date.now()+3600000,cover:'https://example.com/banner.webp',scene:'observatory',frame:'golden-thread',aura:'celestial',trial:true,admin:false};
test('group rows adopt current public membership and banner while retaining group timings',()=>{const result=withPublicIdentity(member,{uid:'member',displayName:'Current name',avatarUrl:'new.webp',publicStyle:style,daySeconds:0,email:'private'} as any);assert.equal(result.displayName,'Current name');assert.equal(result.avatarUrl,'new.webp');assert.equal((result as any).publicStyle.cover,style.cover);assert.equal(result.todaySeconds,2400);assert.equal(result.status,'focusing');assert.equal('email' in result,false);assert.equal('daySeconds' in result,false);assert.equal(publicPlusActive((result as any).publicStyle),true);});
test('missing or unrelated projections preserve group identity',()=>{assert.equal(withPublicIdentity(member),member);assert.equal(withPublicIdentity(member,{uid:'other',displayName:'Other',avatarUrl:''}),member);});
test('expiry or membership removal clears visible Plus styling',()=>{const result=withPublicIdentity({...member,publicStyle:style},{uid:'member',displayName:'Member',avatarUrl:'',publicStyle:{...style,plusUntil:0,cover:'',trial:false}});assert.equal(publicPlusActive(result.publicStyle),false);assert.equal(result.publicStyle?.cover,'');});
test('admin entitlement enables publicPlusActive and includes aura and frame',()=>{const adminStyle={plusUntil:0,cover:'',scene:'none',frame:'golden-thread',aura:'celestial',trial:false,admin:true};assert.equal(publicPlusActive(adminStyle),true);});

test('removing an admin overlay retains a separate active paid or trial entitlement',async()=>{
 const {publicStyle}=await import('../src/utils/publicIdentity.ts');
 const settings={plusProfileCoverUrl:'https://example.com/cover.webp',plusProfileScene:'observatory',plusProfileFrame:'golden-thread',plusAvatarEffect:'celestial'} as any;
 for(const isTrial of [false,true]){
  const membership={isPlus:true,status:'active',currentPeriodEnd:Date.now()+3600000,isTrial,adminAccess:false} as any;
  const result=publicStyle(settings,membership);
  assert.equal(result.admin,false);assert.equal(result.plusUntil,membership.currentPeriodEnd);assert.equal(result.trial,isTrial);assert.equal(result.cover,settings.plusProfileCoverUrl);
 }
 assert.equal(publicStyle(settings,null).plusUntil,0);
 assert.equal(publicStyle(settings,null).cover,'');
});

test('all public surfaces prefer the entitled animated profile over Google photos',async()=>{
 const {publicAvatar}=await import('../src/utils/publicIdentity.ts');
 const settings={avatarUrl:'custom.webp',plusAnimatedAvatarUrl:'/avatars/identity-jade.svg'} as any;
 const user={photoURL:'google-photo.webp'};
 const paid={isPlus:true,status:'active',currentPeriodEnd:Date.now()+3600000} as any;
 assert.equal(publicAvatar(settings,user,paid),'/avatars/identity-jade.svg');
 assert.equal(publicAvatar(settings,user,{adminAccess:true} as any),'/avatars/identity-jade.svg');
 assert.equal(publicAvatar(settings,user,null),'custom.webp');
 assert.equal(publicAvatar({} as any,user,null),'google-photo.webp');
});
