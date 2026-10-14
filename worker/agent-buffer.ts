import type {AgentTransaction,AgentDocument,Data} from './agent-store.ts';
/** Read-your-writes overlay; one version-checked Firestore write per document. */
export function bufferTransaction(base:AgentTransaction){
 const pending=new Map<string,{data:Data;create:boolean;timestamps:Set<string>}>();
 const removed=new Set<string>();
 const originals=new Map<string,AgentDocument>();
 const tx:AgentTransaction={
  async read(path){if(!originals.has(path))originals.set(path,await base.read(path));const original=originals.get(path)!;const p=pending.get(path);return { ...original,data:removed.has(path)?null:p?structuredClone(p.data):structuredClone(original.data)};},
  query:q=>base.query(q),
  delete(path){if(!originals.has(path))throw Error("Read before delete");pending.delete(path);removed.add(path);},
  create(path,data,timestamps=[]){if(pending.has(path)||originals.get(path)?.data)throw Error('Document already exists');pending.set(path,{data:structuredClone(data),create:true,timestamps:new Set(timestamps)});},
  patch(path,data,timestamps=[]){const original=originals.get(path);if(!original&&!pending.has(path))throw Error('Read before patch');const p=pending.get(path);pending.set(path,{data:{...(p?.data||original?.data||{}),...structuredClone(data)},create:p?.create||false,timestamps:new Set([...(p?.timestamps||[]),...timestamps])});}
 };
 return {tx,flush(){for(const path of removed){if(!base.delete)throw Error("Deletion adapter missing");base.delete(path);}for(const [path,p]of pending){if(p.create)base.create(path,p.data,[...p.timestamps]);else base.patch(path,p.data,[...p.timestamps]);}}};
}
