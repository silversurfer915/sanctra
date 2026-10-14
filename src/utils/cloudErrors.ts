export function cloudErrorMessage(error:unknown,action:string):string {
 const code=typeof error==='object' && error && 'code' in error ? String(error.code) : '';
 if(code.endsWith('permission-denied'))return `Permission denied while trying to ${action}. Your signed-in account and the deployed Firestore rules must allow this operation. Your changes have not been discarded.`;
 if(code.endsWith('failed-precondition'))return `Could not ${action}. The database may need the required index or this record changed. Reopen it and retry.`;
 if(code.endsWith('unavailable'))return `Could not ${action} while offline. Reconnect and retry.`;
 return `Could not ${action}. ${error instanceof Error ? error.message : 'Please reconnect and retry.'}`;
}
