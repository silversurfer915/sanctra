// Disable only anonymous sign-in; Google and email provider settings remain unchanged.
const fs=require('node:fs'),path=require('node:path');
const bin=process.env.PATH.split(path.delimiter).map(d=>path.join(d,'firebase')).find(f=>fs.existsSync(f));
const root=path.resolve(path.dirname(fs.realpathSync(bin)),'..');
const {Client}=require(path.join(root,'apiv2.js')),{requireAuth}=require(path.join(root,'requireAuth.js')),{getGlobalDefaultAccount}=require(path.join(root,'auth.js'));
(async()=>{const project='studyapp-4137d';await requireAuth({project,...getGlobalDefaultAccount()});const client=new Client({urlPrefix:'https://identitytoolkit.googleapis.com',apiVersion:'admin/v2'}),name=`projects/${project}/config`;const before=(await client.get('/'+name)).body;
 if(before.signIn?.anonymous?.enabled)await client.patch('/'+name+'?updateMask=signIn.anonymous.enabled',{name,signIn:{anonymous:{enabled:false}}});
 const after=(await client.get('/'+name)).body;if(after.signIn?.anonymous?.enabled)throw Error('Anonymous sign-in remains enabled.');console.log('Anonymous sign-in disabled and verified. Other sign-in settings preserved.');})().catch(e=>{console.error(e.message);process.exitCode=1;});
