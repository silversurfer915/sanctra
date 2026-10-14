import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import { collection, doc, onSnapshot, writeBatch } from 'firebase/firestore';
import type { JeeTrackState } from '../../types/jeetrack.ts';
import { getDefaultJeeTrackState } from '../../utils/jeetrackData.ts';
import { getCloudDatabase } from '../../utils/firebase.ts';
import { flattenJeeState, inflateJeeRecords, importJeeTrackData, sanitizeLegacyJeeState, validateJeeTrackState, type JeeCloudRecord } from '../../utils/jeeTrackValidation.ts';
export type JeeSyncStatus = 'loading' | 'synced' | 'saving' | 'offline' | 'error' | 'signed-out';
const cacheKey = (uid: string) => `sanctra_jeetrack_v2:${uid}`;
function acknowledgeCachedWrites(account:string, changes:[string,JeeCloudRecord|null][]) {
  // An older account's in-flight commit can finish after sign-out or a pause.
  // Clear only the exact acknowledged cache entries, without touching current refs.
  try {
    const raw=localStorage.getItem(cacheKey(account));if(!raw)return;
    const saved=JSON.parse(raw);if(!Array.isArray(saved.pending))return;
    const queue=new Map<string,JeeCloudRecord|null>(saved.pending);
    for(const [id,record] of changes)if(JSON.stringify(queue.get(id))===JSON.stringify(record))queue.delete(id);
    localStorage.setItem(cacheKey(account),JSON.stringify({...saved,pending:[...queue]}));
  }catch{}
}
export function useJeeTrackStore(uid?: string | null) {
  const [state,setState]=useState<JeeTrackState>(getDefaultJeeTrackState);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [syncStatus,setSyncStatus]=useState<JeeSyncStatus>('loading');
  const [revision,setRevision]=useState(0);
  const stateRef=useRef(state), identity=useRef(uid);
  const pending=useRef(new Map<string,JeeCloudRecord|null>());
  const remote=useRef(new Map<string,JeeCloudRecord>());
  const generation=useRef(0);
  const flushing=useRef<{account:string;generation:number}|null>(null);
  const ready=useRef(false);
  const [legacyAvailable,setLegacyAvailable]=useState(false);
  const publish=useCallback((next:JeeTrackState, account:string) => {
    if(identity.current!==account && !(identity.current===null && account==='guest'))return;
    stateRef.current=next;setState(next);
    const key = account ? cacheKey(account) : 'sanctra_jeetrack_local';
    try { localStorage.setItem(key,JSON.stringify({state:next,pending:[...pending.current]})); } catch { /* Cloud remains authoritative when local storage is unavailable. */ }
  },[]);
  const flush=useCallback(async () => {
    const account=identity.current, db=getCloudDatabase();
    const isGuest = !account || account.startsWith('guest-') || account.startsWith('preview-');
    if(!account || isGuest || !db || flushing.current || !ready.current || !pending.current.size)return;
    const epoch=generation.current, token={account,generation:epoch};
    flushing.current=token;setSyncStatus('saving');setError(null);
    try {
      while(identity.current===account && generation.current===epoch && pending.current.size) {
        const changes=[...pending.current].slice(0,400),batch=writeBatch(db);
        for(const [id,record] of changes) { const ref=doc(db,'users',account,'jeetrack',id);if(record)batch.set(ref,JSON.parse(JSON.stringify(record)));else batch.delete(ref); }
        await batch.commit();
        acknowledgeCachedWrites(account,changes);
        if(identity.current!==account || generation.current!==epoch)break;
        for(const [id,record] of changes) if(JSON.stringify(pending.current.get(id))===JSON.stringify(record))pending.current.delete(id);
        try{localStorage.setItem(cacheKey(account),JSON.stringify({state:stateRef.current,pending:[...pending.current]}));}catch{}
      }
      if(identity.current===account && generation.current===epoch) {setSyncStatus('synced');setError(null);}
    } catch(e) {
      if(identity.current===account && generation.current===epoch) {setSyncStatus('error');setError(e instanceof Error?`JEE Track could not sync: ${e.message}`:'JEE Track could not sync. Retry to save your changes.');}
    } finally {if(flushing.current===token)flushing.current=null;}
  },[]);
  useEffect(()=> {
    generation.current+=1;flushing.current=null;
    identity.current=uid;pending.current=new Map();remote.current=new Map();ready.current=false;
    setLoading(true);setError(null);
    const isGuest = !uid || uid.startsWith('guest-') || uid.startsWith('preview-');
    setSyncStatus(isGuest?'synced':'loading');
    let initial=getDefaultJeeTrackState(),hasCachedState=false;
    const effectiveKey = uid ? cacheKey(uid) : 'sanctra_jeetrack_local';
    try {
      const raw=localStorage.getItem(effectiveKey);
      if(raw){
        const saved=JSON.parse(raw);
        const validated=importJeeTrackData(raw);
        if(validated){initial=validated;hasCachedState=true;}
        if(Array.isArray(saved.pending) && saved.pending.length<=5000)pending.current=new Map(saved.pending);
      }
    }catch{}
    stateRef.current=initial;setState(initial);
    try {setLegacyAvailable(!!localStorage.getItem('sanctra_jeetrack_state_v1'));}catch{setLegacyAvailable(false);}
    if(isGuest){ready.current=true;setLoading(false);return;}
    const account=uid!,db=getCloudDatabase();
    if(!db){setLoading(false);setSyncStatus('error');setError('Sign in and reconnect to sync JEE Track.');return;}
    return onSnapshot(collection(db,'users',account,'jeetrack'), {includeMetadataChanges:true}, snapshot=> {
      if(identity.current!==account)return;
      try {
        remote.current=new Map(snapshot.docs.map(d=>[d.id,d.data() as JeeCloudRecord]));
        const combined=new Map(remote.current);
        for(const [id,record] of pending.current) if(record)combined.set(id,record);else combined.delete(id);
        // Empty cache-only snapshots must not erase account-scoped offline records.
        if(snapshot.empty && snapshot.metadata.fromCache && !ready.current){
          if(hasCachedState){remote.current=flattenJeeState(initial);ready.current=true;setLoading(false);}
          setSyncStatus('offline');return;
        }
        publish(inflateJeeRecords(combined),account);ready.current=true;setLoading(false);setError(null);
        setSyncStatus(snapshot.metadata.fromCache?'offline':pending.current.size?'saving':'synced');
        void flush();
      }catch(e){setLoading(false);setSyncStatus('error');setError(e instanceof Error?e.message:'JEE records could not be loaded.');}
    },e=>{if(identity.current===account){setLoading(false);setSyncStatus('error');setError(`JEE Track could not load: ${e.message}`);}});
  },[uid,revision,publish,flush]);
  const update=useCallback((value:SetStateAction<JeeTrackState>) => {
    const account=identity.current;
    if(!ready.current){setError('Wait for your preparation records to load before making changes.');return false;}
    try {
      const before=stateRef.current, next=validateJeeTrackState(typeof value==='function'?value(before):value);
      const isGuest = !account || account.startsWith('guest-') || account.startsWith('preview-');
      if (isGuest) {
        publish(next, account || 'guest');
        return true;
      }
      const oldRecords=flattenJeeState(before), newRecords=flattenJeeState(next);
      for(const [id,record] of newRecords) if(JSON.stringify(record)!==JSON.stringify(oldRecords.get(id)))pending.current.set(id,record);
      for(const id of oldRecords.keys())if(!newRecords.has(id))pending.current.set(id,null);
      publish(next,account);void flush();return true;
    }catch(e){setError(e instanceof Error?e.message:'Invalid JEE record.');return false;}
  },[publish,flush]);
  const retry=useCallback(()=>{if(ready.current && pending.current.size)void flush();else setRevision(v=>v+1);},[flush]);
  const importLegacy=useCallback(()=> {
    try {const raw=localStorage.getItem('sanctra_jeetrack_state_v1');const legacy=raw?importJeeTrackData(raw):null;
      if(!legacy){setError('The older local backup is invalid. Export or inspect it before importing.');return;}
      if(!update(sanitizeLegacyJeeState(legacy)))return;
      // Keep the original backup recoverable; never delete or assign it silently.
      setLegacyAvailable(false);
    }catch{setError('Could not read the older local backup.');}
  },[update]);
  const changingAccount=identity.current!==uid;
  return {state:changingAccount?getDefaultJeeTrackState():state,update,loading:changingAccount||loading,error:changingAccount?null:error,retry,syncStatus:changingAccount?'loading' as JeeSyncStatus:syncStatus,legacyAvailable:changingAccount?false:legacyAvailable,importLegacy};
}

export type JeeTrackStore = ReturnType<typeof useJeeTrackStore>;
