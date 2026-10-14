export interface AiConfig {
 enabled:boolean; maintenanceMessage:string; model:string;
 chatEnabled:boolean; manualEnabled:boolean; validationEnabled:boolean;
 requestsPerMinute:number; inputPricePerMillion:number; outputPricePerMillion:number;
}
export interface AiUserAccess {extraDaily:number;enabled:boolean;dailyLimit:number|null;requestsPerMinute:number|null}
export const DEFAULT_AI_CONFIG:AiConfig={enabled:true,maintenanceMessage:'Sanctra AI is taking a short break. Please try again later.',model:'',chatEnabled:true,manualEnabled:true,validationEnabled:true,requestsPerMinute:6,inputPricePerMillion:0,outputPricePerMillion:0};
export const DEFAULT_AI_ACCESS:AiUserAccess={extraDaily:0,enabled:true,dailyLimit:null,requestsPerMinute:null};
export function aiConfig(value:Partial<AiConfig>={}):AiConfig {return {...DEFAULT_AI_CONFIG,...value};}
export function aiAccess(value:Partial<AiUserAccess>={}):AiUserAccess {return {...DEFAULT_AI_ACCESS,...value};}
export function aiBlocked(config:AiConfig,access:AiUserAccess,mode:string):string|null {
 if(!config.enabled)return config.maintenanceMessage||DEFAULT_AI_CONFIG.maintenanceMessage;
 if(!access.enabled)return 'AI access is paused for your account. Contact support if you need help.';
 if((mode==='chat'||mode==='assistant')&&!config.chatEnabled)return 'AI chat is temporarily paused. You can still use available planning tools.';
 if(mode==='manual-session'&&!config.manualEnabled)return 'AI session logging is temporarily paused. Your saved history is kept.';
 if(mode==='validate-session'&&!config.validationEnabled)return 'AI ranking validation is temporarily paused. Your saved history is kept.';
 return null;
}
export function estimatedCostMicros(input:number,output:number,config:AiConfig) {
 return Math.max(0,Math.round(input*config.inputPricePerMillion+output*config.outputPricePerMillion));
}
