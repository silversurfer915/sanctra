import test from 'node:test';import assert from 'node:assert/strict';
import {isRegisteredAccount} from '../src/utils/authAccess.ts';
const registered={uid:'firebase-account',isAnonymous:false,email:'member@example.com',displayName:'Member',photoURL:null};
test('registered Firebase identities can restore a desk',()=>{assert.equal(isRegisteredAccount(registered),true);});
test('anonymous, retired local and malformed identities cannot restore a desk',()=>{for(const value of [null,{}, {...registered,isAnonymous:true}, {...registered,uid:'guest-old'}, {...registered,uid:'local-old'}, {...registered,uid:'google-old'}, {...registered,uid:''}, {...registered,email:12}])assert.equal(isRegisteredAccount(value),false);});
