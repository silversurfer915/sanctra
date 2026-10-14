// Gemini also uses bracket-style math delimiters. Leave code samples untouched.
export function normalizeMathMarkdown(text:string):string {
 return text.split(/(```[\s\S]*?```|`[^`\n]*`)/g).map((part,index)=>index%2?part:part.replace(/\\\[([\s\S]*?)\\\]/g,(_,math:string)=>`\n\n$$${math}$$\n\n`).replace(/\\\((.*?)\\\)/g,(_,math:string)=>`$${math}$`)).join('');
}
