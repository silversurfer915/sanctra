// Uses the existing Firebase CLI owner login. Never provisions or changes admin roles.
const fs=require('node:fs'),path=require('node:path');
const bin=process.env.PATH.split(path.delimiter).map(dir=>path.join(dir,'firebase')).find(file=>fs.existsSync(file));
if(!bin)throw new Error('Firebase CLI is required.');
const root=path.resolve(path.dirname(fs.realpathSync(bin)),'..');
const {getGlobalDefaultAccount}=require(path.join(root,'auth.js'));
const {requireAuth}=require(path.join(root,'requireAuth.js'));
const {Client}=require(path.join(root,'apiv2.js'));
(async()=>{
 const options={project:'studyapp-4137d',...getGlobalDefaultAccount()};await requireAuth(options);
 const lookup=new Client({urlPrefix:'https://identitytoolkit.googleapis.com',apiVersion:'v1'});
 const account=(await lookup.post('/projects/studyapp-4137d/accounts:lookup',{email:['ponhareeshn@gmail.com']})).body.users?.find(u=>u.email==='ponhareeshn@gmail.com'&&u.emailVerified===true);
 if(!account)throw new Error('Verified owner account not found.');
 const client=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1'}),base='/projects/studyapp-4137d/databases/(default)/documents';
 await client.get(`${base}/admins/${account.localId}`);
 const source=fs.readFileSync(process.argv[2]||'docs/ANNOUNCEMENT_OCT_02.md','utf8'),title=source.split('\n')[0].replace(/^# /,''),text=source.slice(source.indexOf('\n')).trim();
 if(title.length>100||text.length>5000)throw new Error('Announcement exceeds supported length.');
 const id=process.argv[3]||'release-2026-10-02-focus-and-scenes';
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw new Error('Invalid announcement document ID.');
 const coverUrl=process.argv[4]||'/backgrounds/illustrated-study-desk.v2.webp';
 if(!/^\/backgrounds\/[a-zA-Z0-9._-]+$/.test(coverUrl))throw new Error('Use a deployed Sanctra cover asset.');
 const fields={title:{stringValue:title},text:{stringValue:text},authorUid:{stringValue:account.localId},timestamp:{integerValue:String(Date.now())},category:{stringValue:'Product update'},pinned:{booleanValue:false},popupMode:{stringValue:'once'},expiresAt:{integerValue:String(Date.now()+14*86400000)},autoCloseSeconds:{integerValue:'0'},coverUrl:{stringValue:coverUrl}};
 try{await client.post(`${base}/announcements?documentId=${id}`,{fields});}catch(error){if(error.status!==409)throw error;}
 const result=(await client.get(`${base}/announcements/${id}`)).body;
 if(result.fields.title.stringValue!==title||result.fields.text.stringValue!==text)throw new Error('Published content differs; no overwrite attempted.');
 console.log('Announcement published and verified: '+id);
})().catch(error=>{console.error(error.message);process.exitCode=1;});
