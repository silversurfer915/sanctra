import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AiGatewayError,aiErrorMessage} from '../src/features/ai-planner/errors.ts';

test('trusted gateway messages explain model and maintenance failures',()=>{
 for(const message of ['The AI model is unavailable. Please try again shortly.','AI is paused for maintenance.','Your daily AI allowance is used. It resets at midnight UTC.']){
  assert.equal(aiErrorMessage(new AiGatewayError(message)),message);
 }
});
test('raw provider errors remain private and timeouts are actionable',()=>{
 assert.equal(aiErrorMessage(new Error('internal credentials and provider details')),'Sanctra AI is temporarily unavailable.');
 assert.equal(aiErrorMessage(new DOMException('Timed out','TimeoutError')),'AI took too long to reply. Please try again.');
});
