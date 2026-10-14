export interface FirestoreDocument {
  name: string;
  createTime?: string;
  updateTime?: string;
  fields?: Record<string, unknown>;
}

export interface RetiredExamArchivePayload {
  users: Array<Record<string, unknown>>;
  studyGroups: Array<Record<string, unknown>>;
  counts: {
    usersScanned: number;
    usersArchived: number;
    groupsScanned: number;
    groupsArchived: number;
    sessionGoalLinks: number;
  };
}

export function extractRetiredExamData(input: {
  users?: FirestoreDocument[];
  studyGroups?: FirestoreDocument[];
}): RetiredExamArchivePayload;
