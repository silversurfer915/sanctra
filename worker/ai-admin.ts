import {aiConfig,aiAccess,aiBlocked,estimatedCostMicros,type AiConfig,type AiUserAccess} from '../src/features/ai-admin/config.ts';
export const unpackAi=(doc:any):Record<string,any>=>Object.fromEntries(Object.entries(doc?.fields||{}).map(([k,v]:[string,any])=>[k,v.integerValue!==undefined?Number(v.integerValue):v.doubleValue??v.booleanValue??v.stringValue??(v.nullValue!==undefined?null:undefined)]));
export async function readAiControls(base:string,token:string,uid:string,mode:string) {
 const read=async(path:string)=>{const r=await fetch(`${base}/${path}`,{headers:{authorization:`Bearer ${token}`}});if(r.status===404)return {};if(!r.ok)throw Error('Reconnect to Sanctra before using AI.');return unpackAi(await r.json());};
 const [rawConfig,rawAccess]=await Promise.all([read('ai_config/global'),read(`ai_access/${uid}`)]);
 const config=aiConfig(rawConfig),access=aiAccess(rawAccess);
 return {config,access,blocked:aiBlocked(config,access,mode)};
}
const integer=(value:number)=>({integerValue:String(value)});
/** CAS reservation: one account-wide minute window, independent of tabs or AI feature. */
export async function reserveAiRate(base:string,token:string,uid:string,config:AiConfig,access:AiUserAccess,now=Date.now()) {
 const day=Math.floor(now/86400000),windowStart=Math.floor(now/60000),path=`ai_usage_days/${day}/users/${uid}`,name=`${base.split('/v1/')[1]}/${path}`;
 const headers={authorization:`Bearer ${token}`,'content-type':'application/json'};
 for(let i=0;i<5;i++){
  const r=await fetch(`${base}/${path}`,{headers});if(!r.ok&&r.status!==404)throw Error('AI usage could not be checked. Try again.');
  const document=r.ok?await r.json() as any:null,previous=unpackAi(document);
  const count=previous.windowStart===windowStart?Number(previous.windowCount||0):0;
  if(count>=(access.requestsPerMinute??config.requestsPerMinute))return null;
  const commit=await fetch(`${base}:commit`,{method:'POST',headers,body:JSON.stringify({writes:[{update:{name,fields:{uid:{stringValue:uid},day:integer(day),windowStart:integer(windowStart),windowCount:integer(count+1)}},updateMask:{fieldPaths:['uid','day','windowStart','windowCount']},currentDocument:document?{updateTime:document.updateTime}:{exists:false}}]})});
  if(commit.ok)return {path,name};if(![409,412].includes(commit.status))throw Error('AI usage could not be reserved. Try again.');
 }
 throw Error('AI is busy. Try again shortly.');
}
export async function recordAiUsage(base:string,token:string,name:string,config:AiConfig,model:string,output:any,success:boolean,requestId:string=crypto.randomUUID()) {
 const input=Math.max(0,Number(output?.usageMetadata?.promptTokenCount||0)),out=Math.max(0,Number(output?.usageMetadata?.candidatesTokenCount||0)+Number(output?.usageMetadata?.thoughtsTokenCount||0));
 const increments={requests:1,completed:success?1:0,failed:success?0:1,inputTokens:input,outputTokens:out,costMicros:estimatedCostMicros(input,out,config)};
 const uid=name.split('/').at(-1)!,receipt=`${base.split('/v1/')[1]}/ai_usage_events/${uid}/requests/${requestId}`;
 const headers={authorization:`Bearer ${token}`,'content-type':'application/json'};
 for(let attempt=0;attempt<3;attempt++) {
  if(attempt){const prior=await fetch(`https://firestore.googleapis.com/v1/${receipt}`,{headers});if(prior.ok)return;if(prior.status!==404)continue;}
  try {
   const r=await fetch(`${base}:commit`,{method:'POST',headers,body:JSON.stringify({writes:[{update:{name,fields:{model:{stringValue:model},pricingConfigured:{booleanValue:config.inputPricePerMillion>0||config.outputPricePerMillion>0}}},updateMask:{fieldPaths:['model','pricingConfigured']},updateTransforms:[...Object.entries(increments).map(([fieldPath,value])=>({fieldPath,increment:integer(value)})),{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}]},{update:{name:receipt,fields:{model:{stringValue:model},...Object.fromEntries(Object.entries(increments).map(([k,v])=>[k,integer(v)]))}},currentDocument:{exists:false}}]})});
   if(r.ok)return;
  }catch{/* Retry with the same receipt ID so a lost response cannot double-count. */}
 }
 throw Error('AI usage reporting could not be saved.');
}
export async function listAiModels(base:string,token:string,uid:string,key:string) {
 const admin=await fetch(`${base}/admins/${uid}`,{headers:{authorization:`Bearer ${token}`}});
 if(!admin.ok)throw Error('Model listing requires a Sanctra administrator.');
 const models: {name:string;displayName:string}[]=[];let pageToken='';
 for(let page=0;page<10;page++){
  const url=new URL('https://generativelanguage.googleapis.com/v1beta/models');url.searchParams.set('pageSize','100');if(pageToken)url.searchParams.set('pageToken',pageToken);
  const r=await fetch(url,{headers:{'x-goog-api-key':key},signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Available models could not load. Enter a model ID instead.');
  const data=await r.json() as any;
  for(const m of data.models||[])if(m.supportedGenerationMethods?.includes('generateContent')&&/^models\/gemini-[A-Za-z0-9._-]+$/.test(m.name))models.push({name:m.name.slice(7),displayName:m.displayName||m.name.slice(7)});
  pageToken=data.nextPageToken||'';if(!pageToken)break;
 }
 return models;
}
