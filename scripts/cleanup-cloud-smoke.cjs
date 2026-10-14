// Run through: pnpm --package=firebase-tools dlx -c 'node scripts/provision-rooms.cjs'
// Creates missing official presets; never overwrites existing room data.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const bin = process.env.PATH.split(path.delimiter).map(dir => path.join(dir,'firebase')).find(file=>fs.existsSync(file));
if (!bin) throw new Error('Run this script through the Firebase CLI package environment.');
const root = path.join(path.dirname(fs.realpathSync(path.join(path.dirname(bin),'..','firebase-tools','package.json'))),'lib');
const { getGlobalDefaultAccount } = require(path.join(root,'auth.js'));
const { requireAuth } = require(path.join(root,'requireAuth.js'));
const { Client } = require(path.join(root,'apiv2.js'));
const manifest=JSON.parse(fs.readFileSync('artifacts/cloud-smoke.local.json','utf8'));
if (manifest.project !== 'studyapp-4137d' || !manifest.roomId.startsWith('smoke-') || manifest.userIds.length!==2) throw new Error('Invalid verification manifest.');
(async()=>{
  const options={project:'studyapp-4137d',...getGlobalDefaultAccount()}; await requireAuth(options);
  const client=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1'});
  const base='/projects/studyapp-4137d/databases/(default)/documents';
  const testPaths=[`users/${manifest.userIds[1]}/community/preferences`,`study_groups/${manifest.roomId}/messages/smoke-message`, `study_groups/${manifest.roomId}/members/${manifest.userIds[1]}`, `study_groups/${manifest.roomId}`,`room_invites/${manifest.roomCode}`, ...manifest.userIds.map(uid=>`users/${uid}`)];
  for (const target of testPaths) await client.delete(`${base}/${target}`);
  const authClient=new Client({urlPrefix:'https://identitytoolkit.googleapis.com',apiVersion:'v1'});
  for (const uid of manifest.userIds) await authClient.post('/projects/studyapp-4137d/accounts:delete',{localId:uid});
  console.log('Removed only the two verification accounts and their private test data.');

})().catch(error=>{console.error(error.message);process.exitCode=1;});
