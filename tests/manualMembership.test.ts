import test from 'node:test';
import assert from 'node:assert/strict';
import { buildManualMembership } from '../src/utils/manualMembership.ts';
import { isEntitlementActive } from '../src/utils/subscriptionPlans.ts';
const now = 1_790_900_000_000, day = 86_400_000;
test('manual monthly and yearly grants use fixed periods with no automatic renewal', () => {
  const monthly = buildManualMembership('member', 'monthly', null, now);
  assert.equal(monthly.currentPeriodEnd, now + 30 * day);
  assert.equal(monthly.cancelAtPeriodEnd, true);
  assert.equal(monthly.activationMethod, 'manual');
  assert.equal(buildManualMembership('member','early_yearly',null,now).currentPeriodEnd,now+365*day);
});
test('manual renewals preserve remaining paid time and expired grants restart today', () => {
  const original = buildManualMembership('member','monthly',null,now);
  assert.equal(buildManualMembership('member','yearly',original,now+day).currentPeriodEnd, original.currentPeriodEnd+365*day);
  assert.equal(buildManualMembership('member','monthly',original,now+31*day).currentPeriodEnd,now+61*day);
});
test('expired or revoked flags do not unlock VIP; guest grants are rejected', () => {
  const membership = buildManualMembership('member','monthly',null,now);
  assert.equal(isEntitlementActive(membership,now+30*day),false);
  assert.equal(isEntitlementActive({...membership,status:'none'},now),false);
  assert.equal(isEntitlementActive({...membership,isPlus:false},now),false);
  assert.throws(()=>buildManualMembership('guest-local','yearly',null,now));
});
import {buildTrialMembership} from '../src/utils/manualMembership.ts';
test('minute and hour trials expire exactly and cannot replace paid time',()=>{assert.equal(buildTrialMembership('member',15,'minutes',null,now).currentPeriodEnd,now+900000);assert.equal(buildTrialMembership('member',2,'hours',null,now).currentPeriodEnd,now+7200000);assert.equal(buildTrialMembership('member',7,'days',null,now).isTrial,true);assert.throws(()=>buildTrialMembership('member',0,'days',null,now));assert.throws(()=>buildTrialMembership('member',1,'days',buildManualMembership('member','yearly',null,now),now));const trial=buildTrialMembership('member',1,'hours',null,now);assert.equal(buildManualMembership('member','monthly',trial,now).isTrial,false);assert.equal(isEntitlementActive(trial,trial.currentPeriodEnd),false);});
