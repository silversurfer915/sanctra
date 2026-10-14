import { doc, increment, writeBatch, type DocumentData, type Firestore } from 'firebase/firestore';
import { chatDay } from './chatAllowance.ts';

/** One commit publishes the message and increments usage. Rules enforce the cap,
 * membership, and the link between these writes, including concurrent sends. */
export function commitGroupMessage(db: Firestore, groupId: string, uid: string, messageId: string, message: DocumentData) {
  const day = chatDay();
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', uid, 'chat_days', String(day)), {
    day, count: increment(1), lastMessageId: messageId, lastGroupId: groupId,
  }, { merge: true });
  batch.set(doc(db, 'study_groups', groupId, 'messages', messageId), message);
  return batch.commit();
}
