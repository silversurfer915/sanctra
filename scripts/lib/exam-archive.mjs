const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

function mapFields(value) {
  return value?.mapValue?.fields || {};
}

function arrayValues(value) {
  return value?.arrayValue?.values || [];
}

function copyNamedFields(source, names) {
  return Object.fromEntries(names.filter((name) => hasOwn(source, name)).map((name) => [name, source[name]]));
}

function extractWorkspaceTargets(settings) {
  return arrayValues(settings.workspaces).flatMap((entry, index) => {
    const fields = mapFields(entry);
    if (!hasOwn(fields, 'targetExam')) return [];
    return [{ index, ...copyNamedFields(fields, ['id', 'workspaceId']), targetExam: fields.targetExam }];
  });
}

function extractSessionGoalLinks(fields) {
  return arrayValues(fields.sessions).flatMap((entry, index) => {
    const session = mapFields(entry);
    if (!hasOwn(session, 'goalId')) return [];
    return [{ index, ...copyNamedFields(session, ['id', 'workspaceId']), goalId: session.goalId }];
  });
}

function extractUser(document) {
  const fields = document.fields || {};
  const settings = mapFields(fields.settings);
  const studyDetails = mapFields(settings.studyDetails);
  const archivedSettings = copyNamedFields(settings, ['targetExam', 'targetExamDate']);
  const archivedStudyDetails = copyNamedFields(studyDetails, ['grade', 'coaching']);
  const workspaces = extractWorkspaceTargets(settings);
  const sessionGoalLinks = extractSessionGoalLinks(fields);

  if (Object.keys(archivedStudyDetails).length) archivedSettings.studyDetails = archivedStudyDetails;
  if (workspaces.length) archivedSettings.workspaces = workspaces;

  const archivedFields = copyNamedFields(fields, ['examGoal', 'examGoals']);
  if (Object.keys(archivedSettings).length) archivedFields.settings = archivedSettings;
  if (sessionGoalLinks.length) archivedFields.sessionGoalLinks = sessionGoalLinks;
  if (!Object.keys(archivedFields).length) return null;

  return {
    document: document.name,
    ...(document.createTime ? { createTime: document.createTime } : {}),
    ...(document.updateTime ? { updateTime: document.updateTime } : {}),
    fields: archivedFields,
  };
}

function extractStudyGroup(document) {
  const fields = document.fields || {};
  if (!hasOwn(fields, 'targetExam')) return null;
  return {
    document: document.name,
    ...(document.createTime ? { createTime: document.createTime } : {}),
    ...(document.updateTime ? { updateTime: document.updateTime } : {}),
    fields: { targetExam: fields.targetExam },
  };
}

export function extractRetiredExamData({ users = [], studyGroups = [] }) {
  const archivedUsers = users.map(extractUser).filter(Boolean);
  const archivedGroups = studyGroups.map(extractStudyGroup).filter(Boolean);
  return {
    users: archivedUsers,
    studyGroups: archivedGroups,
    counts: {
      usersScanned: users.length,
      usersArchived: archivedUsers.length,
      groupsScanned: studyGroups.length,
      groupsArchived: archivedGroups.length,
      sessionGoalLinks: archivedUsers.reduce((total, user) => total + (user.fields.sessionGoalLinks?.length || 0), 0),
    },
  };
}
