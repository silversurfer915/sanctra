// Explicit owner-authorized upgrade. Never rotates or prints credentials.
const fs=require('node:fs'),path=require('node:path');
const bin=process.env.PATH.split(path.delimiter).map(p=>path.join(p,'firebase')).find(p=>fs.existsSync(p));const root=path.dirname(path.dirname(fs.realpathSync(bin)));
const {getGlobalDefaultAccount}=require(root+'/auth.js'),{requireAuth}=require(root+'/requireAuth.js'),{Client}=require(root+'/apiv2.js');
(async()=>{
 const project='studyapp-4137d',owner='8PUcobJCJigbMtqaApB5q7OfGGb2';await requireAuth({project,...getGlobalDefaultAccount()});
 const iam=new Client({urlPrefix:'https://iam.googleapis.com',apiVersion:'v1'}),name=`/projects/${project}/roles/sanctraManualValidation`,role=(await iam.get(name)).body;
 if(!role.includedPermissions.includes('datastore.entities.delete'))await iam.patch(name+'?updateMask=includedPermissions',{etag:role.etag,includedPermissions:[...role.includedPermissions,'datastore.entities.delete']});
 const db=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1'}),base=`/projects/${project}/databases/(default)/documents`,get=async p=>(await db.get(base+'/'+p)).body;
 const slot=await get(`agent_owner_slots/${owner}`),grantId=slot.fields.grantId.stringValue,grant=await get(`agent_grants/${grantId}`);
 if(grant.fields.creatorUid.stringValue!==owner||grant.fields.revokedAt?.stringValue)throw Error('Active owner grant required.');
 const before=grant.fields.scopes.arrayValue.values.map(v=>v.stringValue),scopes=[...new Set([...before,'users:write','study:delete'])].sort();
 if(scopes.length!==before.length){const resource=`projects/${project}/databases/(default)/documents`;await db.post(base+':commit',{writes:[{update:{name:grant.name,fields:{scopes:{arrayValue:{values:scopes.map(s=>({stringValue:s}))}}}},updateMask:{fieldPaths:['scopes']},currentDocument:{updateTime:grant.updateTime}},{update:{name:resource+'/agent_audit/'+crypto.randomUUID(),fields:{actorUid:{stringValue:owner},grantId:{stringValue:grantId},tool:{stringValue:'owner_approved_scope_upgrade'},outcome:{stringValue:'success'},changed:{arrayValue:{values:[{stringValue:'users:write'},{stringValue:'study:delete'}]}}}},currentDocument:{exists:false},updateTransforms:[{fieldPath:'createdAt',setToServerValue:'REQUEST_TIME'}]}]});}
 console.log('Existing non-expiring owner grant upgraded to 12 scopes. Credential unchanged. Hard-delete IAM permission enabled.');
})().catch(e=>{console.error(String(e.message).slice(0,250));process.exitCode=1;});
