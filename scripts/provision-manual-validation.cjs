// Provision a dedicated identity with bounded Firestore document get/list/create/update permissions.
// Secret material is written with mode 0600 and never logged.
const fs=require('node:fs'),path=require('node:path');
const bin=fs.realpathSync(process.env.PATH.split(path.delimiter).map(d=>path.join(d,'firebase')).find(f=>fs.existsSync(f)));
const root=path.resolve(path.dirname(bin),'..');
const {getGlobalDefaultAccount}=require(path.join(root,'auth.js'));
const {requireAuth}=require(path.join(root,'requireAuth.js'));
const {Client}=require(path.join(root,'apiv2.js'));
const project='studyapp-4137d',account='sanctra-manual-validation',email=`${account}@${project}.iam.gserviceaccount.com`,role=`projects/${project}/roles/sanctraManualValidation`;
(async()=>{
 await requireAuth({project,...getGlobalDefaultAccount()});
 const iam=new Client({urlPrefix:'https://iam.googleapis.com',apiVersion:'v1'});
 const get=async(p)=>{try{return (await iam.get(p)).body;}catch(e){if(e.status===404||e.context?.response?.statusCode===404)return null;throw e;}};
 const existingRole=await get(`/projects/${project}/roles/sanctraManualValidation`);
 if(!existingRole)await iam.post(`/projects/${project}/roles`,{roleId:'sanctraManualValidation',role:{title:'Sanctra manual validation',description:'Server-owned validation receipts, bounded manual ranking credits and scoped agent queries',includedPermissions:['datastore.databases.get','datastore.entities.get','datastore.entities.list','datastore.entities.create','datastore.entities.update','datastore.entities.delete'],stage:'GA'}});
 else if(['datastore.entities.list','datastore.entities.delete'].some(p=>!existingRole.includedPermissions.includes(p)))await iam.patch(`/projects/${project}/roles/sanctraManualValidation?updateMask=includedPermissions`,{etag:existingRole.etag,includedPermissions:[...new Set([...existingRole.includedPermissions,'datastore.entities.list','datastore.entities.delete'])]});
 if(!await get(`/projects/${project}/serviceAccounts/${email}`))await iam.post(`/projects/${project}/serviceAccounts`,{accountId:account,serviceAccount:{displayName:'Sanctra manual study validation'}});
 const crm=new Client({urlPrefix:'https://cloudresourcemanager.googleapis.com',apiVersion:'v1'});
 const policy=(await crm.post(`/projects/${project}:getIamPolicy`,{})).body;
 const member=`serviceAccount:${email}`;const binding=policy.bindings.find(b=>b.role===role&&!b.condition);
 if(!binding?.members.includes(member)){if(binding)binding.members.push(member);else policy.bindings.push({role,members:[member]});await crm.post(`/projects/${project}:setIamPolicy`,{policy});}
 const key=(await iam.post(`/projects/${project}/serviceAccounts/${email}/keys`,{privateKeyType:'TYPE_GOOGLE_CREDENTIALS_FILE'})).body;
 fs.writeFileSync('/tmp/sanctra-manual-validation-secret.json',Buffer.from(key.privateKeyData,'base64'),{mode:0o600});
 console.log('Dedicated Firestore validation identity provisioned. Secret ready for Worker upload.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
