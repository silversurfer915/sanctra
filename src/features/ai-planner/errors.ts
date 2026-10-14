// Only messages returned by our gateway may be displayed verbatim.
export class AiGatewayError extends Error {
 constructor(message:string){super(message);this.name='AiGatewayError';}
}
export function aiErrorMessage(error:unknown):string {
 if(error instanceof AiGatewayError)return error.message;
 if(error instanceof Error&&error.name==='TimeoutError')return 'AI took too long to reply. Please try again.';
 const message=error instanceof Error?error.message:'';
 if(/allowance|resets at midnight/i.test(message))return message;
 return /429|quota|resource.exhausted/i.test(message)?'AI is busy. Please try again shortly.':'Sanctra AI is temporarily unavailable.';
}
