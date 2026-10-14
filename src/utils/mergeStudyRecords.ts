export function mergeStudyRecords<T extends {id:string}>(base:readonly T[],local:readonly T[],remote:readonly T[], pending:readonly T[]=[]):T[] {
 const previous=new Map(base.map(item=>[item.id,item]));
 const latest=new Map(remote.map(item=>[item.id,item]));
 const desired=new Map(local.map(item=>[item.id,item]));
 const protectedIds=new Set(pending.map(item=>item.id));
 const result:T[]=[];
 for(const item of local){
  const original=previous.get(item.id);
  if(original && !protectedIds.has(item.id) && JSON.stringify(original)===JSON.stringify(item)){
   const updated=latest.get(item.id);if(updated)result.push(updated);
  }else result.push(item);
 }
 for(const item of remote)if(!desired.has(item.id)&&!previous.has(item.id))result.push(item);
 return result;
}
