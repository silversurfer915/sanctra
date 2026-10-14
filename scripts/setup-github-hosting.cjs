// One-time owner-authorized setup: dedicated Hosting identity, not a personal CLI token.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const bin=process.env.PATH.split(path.delimiter).map(p=>path.join(p,'firebase')).find(p=>fs.existsSync(p));const root=path.dirname(path.dirname(fs.realpathSync(bin)));
const {getGlobalDefaultAccount}=require(root+'/auth.js'),{requireAuth}=require(root+'/requireAuth.js'),{Client}=require(root+'/apiv2.js');
(async()=>{
 const project='studyapp-4137d',repository='silversurfer915/sanctra',account='sanctra-github-hosting',email=`${account}@${project}.iam.gserviceaccount.com`;await requireAuth({project,...getGlobalDefaultAccount()});
 const iam=new Client({urlPrefix:'https://iam.googleapis.com',apiVersion:'v1'});try{await iam.get(`/projects/${project}/serviceAccounts/${email}`);}catch(e){if(e.status!==404&&e.context?.response?.statusCode!==404)throw e;await iam.post(`/projects/${project}/serviceAccounts`,{accountId:account,serviceAccount:{displayName:'Sanctra GitHub Hosting deploy'}});}
 const crm=new Client({urlPrefix:'https://cloudresourcemanager.googleapis.com',apiVersion:'v1'}),policy=(await crm.post(`/projects/${project}:getIamPolicy`,{})).body,member=`serviceAccount:${email}`;
 for(const role of ['roles/firebasehosting.admin','roles/serviceusage.serviceUsageConsumer']){const binding=policy.bindings.find(b=>b.role===role&&!b.condition);if(binding){if(!binding.members.includes(member))binding.members.push(member);}else policy.bindings.push({role,members:[member]});}
 await crm.post(`/projects/${project}:setIamPolicy`,{policy});
 const key=(await iam.post(`/projects/${project}/serviceAccounts/${email}/keys`,{privateKeyType:'TYPE_GOOGLE_CREDENTIALS_FILE'})).body;
 const secret=Buffer.from(key.privateKeyData,'base64');const result=spawnSync('gh',['secret','set','FIREBASE_HOSTING_SERVICE_ACCOUNT','--repo',repository],{input:secret,encoding:'utf8'});secret.fill(0);if(result.status!==0){await iam.delete('/'+key.name);throw Error('GitHub rejected secret setup; unused key removed.');}
 const env=fs.readFileSync('.env.local','utf8');for(const name of ['VITE_FIREBASE_API_KEY','VITE_FIREBASE_AUTH_DOMAIN','VITE_FIREBASE_STORAGE_BUCKET','VITE_FIREBASE_MESSAGING_SENDER_ID','VITE_FIREBASE_APP_ID']){const line=env.split('\n').find(l=>l.startsWith(name+'='));if(!line)throw Error('Missing public web config '+name);let value=line.slice(name.length+1).trim().replace(/^['"]|['"]$/g,'');const r=spawnSync('gh',['variable','set',name,'--repo',repository],{input:value,encoding:'utf8'});if(r.status!==0)throw Error('Could not configure public variable '+name);}
 console.log('Dedicated Hosting deployment secret and five public Firebase web variables configured in GitHub. No key saved locally.');
})().catch(e=>{console.error(String(e.message).slice(0,300));process.exitCode=1;});
