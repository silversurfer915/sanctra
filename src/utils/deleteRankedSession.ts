import {doc,runTransaction,serverTimestamp} from 'firebase/firestore';
import type {StudySession} from '../types/index.ts';
import {getCloudDatabase} from './firebase.ts';
import {publicRanking} from './publicRanking.ts';
import type {IntegrityClock} from './studyIntegrity.ts';
import {rankingAfterDeletion,rankingAfterManualDeletion} from './rankingDeletion.ts';

export async function deleteRankedSession(uid:string,session:StudySession) {
 const db=getCloudDatabase();if(!db)throw new Error('Reconnect before deleting a ranked session.');
 const clockRef=doc(db,'study_integrity',uid),receiptRef=doc(db,'study_integrity',uid,'deleted_sessions',session.id);
 await runTransaction(db,async tx=>{
  const [clock,receipt]=await Promise.all([tx.get(clockRef),tx.get(receiptRef)]);
  if(receipt.exists())return;
  const verdict = session.source === 'ai-manual' ? await tx.get(doc(db,'manual_validations',uid,'sessions',session.id)) : null;
  const approved = verdict?.exists() && verdict.data().status === 'approved';
  if(clock.exists()){
    const old=clock.data() as IntegrityClock;
    const totals=approved?rankingAfterManualDeletion(old,verdict!.data()):rankingAfterDeletion(old,session);
    const next={...old,...totals};tx.update(clockRef,totals);if(next.registered)tx.set(doc(db,'study_rankings',uid),publicRanking(next));
  }
  tx.set(receiptRef,{sessionId:session.id,deletedAt:serverTimestamp()});
 });
}
