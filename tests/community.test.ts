import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCommunity,joinCommunity,leaveCommunity,sortCommunityRooms} from '../src/utils/communityState.ts';
test('multiple memberships keep primary first and leaving chooses a remaining primary',()=>{
 let prefs=normalizeCommunity();prefs=joinCommunity(prefs,'a');prefs=joinCommunity(prefs,'b');prefs=joinCommunity(prefs,'a');
 assert.deepEqual(prefs.joinedIds,['a','b']);assert.equal(prefs.primaryId,'a');
 assert.deepEqual(sortCommunityRooms([{id:'b'},{id:'a'}],prefs.primaryId),[{id:'a'},{id:'b'}]);
 prefs=leaveCommunity(prefs,'a');assert.equal(prefs.primaryId,'b');prefs=leaveCommunity(prefs,'b');assert.equal(prefs.primaryId,null);
});
import {mergeCommunity} from '../src/utils/communityState.ts';
test('guest upgrades retain existing account primary and both sets of memberships',()=>{
 const guest=normalizeCommunity({joinedIds:['guest'],primaryId:'guest'}),account=normalizeCommunity({joinedIds:['account'],primaryId:'account'});
 assert.deepEqual(mergeCommunity(guest,account).joinedIds,['account','guest']);assert.equal(mergeCommunity(guest,account).primaryId,'account');
});
