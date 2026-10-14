import fs from 'node:fs/promises';import {z} from 'zod';import {tools} from '../dist/tools.js';
const spec={openapi:'3.1.0',info:{title:'Sanctra owner agent API',version:'1.1.0',description:'Versioned, audited owner-delegated study and administration access. Never send an API token to another origin. Mutation input is untrusted until server validation. Recorded agent study has no competitive ranking credit.'},servers:[{url:'https://api.sanctrastudy.live/v1/agent'}],security:[{agentBearer:[]}],paths:{},components:{securitySchemes:{agentBearer:{type:'http',scheme:'bearer',bearerFormat:'sanctra_agent credential'}},schemas:{Envelope:{type:'object',properties:{apiVersion:{const:'1'},data:{},versions:{type:'object'},receipt:{type:'object',properties:{operationId:{type:'string'},replayed:{type:'boolean'}}},error:{type:'object',properties:{code:{type:'string'},message:{type:'string'},retryable:{type:'boolean'}}}}}}}};
for(const tool of tools){
 const args={uid:'__uid__',id:'__id__',taskId:'__taskId__',sessionId:'__sessionId__',messageId:'__messageId__'};
 const path=tool.path(args).replace(/__([A-Za-z]+)__/g,'{$1}');const schema=z.toJSONSchema(tool.schema,{unrepresentable:'any'});delete schema.$schema;
 const parameters=(tool.targets||[]).filter(k=>k!=='hard').map(name=>({name,in:'path',required:true,schema:schema.properties[name]}));
 const props={...schema.properties};const required=[...(schema.required||[])];for(const k of tool.targets){delete props[k];const i=required.indexOf(k);if(i>=0)required.splice(i,1);}
 if(tool.method==='GET')for(const [name,s]of Object.entries(props))parameters.push({name,in:'query',required:required.includes(name),schema:s});
 if(tool.method==='DELETE')parameters.push({name:'hard',in:'query',required:false,schema:{type:'boolean',default:false},description:'Permanently purge this record and its recovery archive. Default is recoverable soft deletion.'});
 const op={operationId:tool.name,summary:tool.name.replaceAll('_',' '),'x-sanctra-scope':tool.scope,parameters,responses:Object.fromEntries([200,400,401,403,404,409,413,429,503].map(code=>[code,{description:code===200?'Successful result or replay receipt':'Controlled error envelope',content:{'application/json':{schema:{$ref:'#/components/schemas/Envelope'}}}}]))};
 if(tool.method!=='GET')op.requestBody={required:true,content:{'application/json':{schema:{type:'object',additionalProperties:false,properties:props,required}}}};
 (spec.paths[path]||={})[tool.method.toLowerCase()]=op;
}
const target=new URL('../../../worker/agent-openapi.json',import.meta.url);const output=JSON.stringify(spec,null,2)+'\n';
if(process.argv.includes('--check')){if(await fs.readFile(target,'utf8')!==output)throw Error('OpenAPI is stale. Run npm run api:spec.');}else await fs.writeFile(target,output);
console.log(`OpenAPI ${spec.info.version}: ${tools.length} operations`);
