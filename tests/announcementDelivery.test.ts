import{test}from'node:test';import assert from'node:assert/strict';import{popupEligible,popupReadId,popupSeen,announcementVisible,announcementState}from'../src/utils/announcementDelivery.ts';
test('legacy product updates show once and respect saved account reads',()=>{const item={id:'update'};assert.equal(popupEligible(item),true);assert.equal(popupSeen(item,['announcement-update']),true);});
test('refresh delivery ignores old reads while inbox-only and expired updates stay hidden',()=>{assert.equal(popupSeen({id:'a',popupMode:'refresh'},['announcement-a']),false);assert.equal(popupEligible({id:'a',popupMode:'off'}),false);assert.equal(popupEligible({id:'a',expiresAt:100},100),false);assert.equal(popupEligible({id:'a',expiresAt:101},100),true);assert.equal(popupEligible({id:'a',category:'Community'}),false);});
test('daily delivery creates a new read key on the next local calendar day',()=>{const item={id:'a',popupMode:'daily' as const},today=new Date(2026,9,3,12).getTime(),tomorrow=new Date(2026,9,4,12).getTime();assert.notEqual(popupReadId(item,today),popupReadId(item,tomorrow));assert.equal(popupSeen(item,[popupReadId(item,today)],today),true);assert.equal(popupSeen(item,[popupReadId(item,today)],tomorrow),false);});

test('drafts and scheduled announcements stay hidden until published and due',()=>{
 const base={id:'a',status:'published' as const,startsAt:200,expiresAt:300};
 assert.equal(announcementVisible(base,false,199),false);
 assert.equal(announcementVisible(base,false,200),true);
 assert.equal(announcementVisible(base,false,300),false);
 assert.equal(announcementVisible({...base,status:'draft'},false,250),false);
 assert.equal(announcementState(base,199),'Scheduled');
 assert.equal(announcementState({...base,status:'draft'},250),'Draft');
});
test('audience targeting and archiving apply to inbox and popups',()=>{
 const item={id:'a',audience:'plus' as const};
 assert.equal(announcementVisible(item,false),false);assert.equal(popupEligible(item,Date.now(),false),false);
 assert.equal(announcementVisible(item,true),true);assert.equal(announcementVisible({...item,deleted:true},true),false);
 assert.equal(announcementVisible({...item,audience:'free'},false),true);
});
