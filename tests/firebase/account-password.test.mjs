import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp, deleteApp} from 'firebase/app';
import {getAuth, connectAuthEmulator, signInWithCredential, GoogleAuthProvider, signOut, signInWithEmailAndPassword} from 'firebase/auth';
import {saveAccountPassword} from '../../src/utils/accountPassword.ts';

test('Google account gains password sign-in with the same uid and retains Google', async () => {
  assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST, 'Run this test with the Auth emulator');
  const app = initializeApp({apiKey:'demo-key', projectId:'demo-sanctra'}, `password-${Date.now()}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, {disableWarnings:true});
  try {
    const email = `password-${Date.now()}@example.com`;
    const google = GoogleAuthProvider.credential(JSON.stringify({sub:email, email, email_verified:true}));
    const {user} = await signInWithCredential(auth, google);
    const uid = user.uid;
    await saveAccountPassword(user, 'Test-only-password-42');
    assert.deepEqual(user.providerData.map(p=>p.providerId).sort(), ['google.com','password']);
    await signOut(auth);
    const signedIn = await signInWithEmailAndPassword(auth, email, 'Test-only-password-42');
    assert.equal(signedIn.user.uid, uid);
    await saveAccountPassword(signedIn.user, 'Updated-test-password-42');
    await signOut(auth);
    await assert.rejects(signInWithEmailAndPassword(auth, email, 'Test-only-password-42'));
    assert.equal((await signInWithEmailAndPassword(auth, email, 'Updated-test-password-42')).user.uid, uid);
    await signOut(auth);
    assert.equal((await signInWithCredential(auth, google)).user.uid, uid);
  } finally {await deleteApp(app);}
});
