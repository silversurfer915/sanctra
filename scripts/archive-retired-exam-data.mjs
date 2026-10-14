#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chmod, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { extractRetiredExamData } from './lib/exam-archive.mjs';

const PROJECT_ID = 'studyapp-4137d';
const DATABASE_ID = '(default)';
const API_ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

function firebaseAccessToken() {
  const response = JSON.parse(execFileSync('firebase', ['login:list', '--json'], { encoding: 'utf8' }));
  const token = response.result?.find((entry) => entry.tokens?.access_token)?.tokens?.access_token;
  if (!token) throw new Error('Firebase CLI is not signed in. Run firebase login, then retry.');
  return token;
}

async function listDocuments(collectionId, token) {
  const documents = [];
  let pageToken = '';
  do {
    const url = new URL(`${API_ROOT}/${collectionId}`);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Unable to read ${collectionId}: ${response.status} ${await response.text()}`);
    const page = await response.json();
    documents.push(...(page.documents || []));
    pageToken = page.nextPageToken || '';
  } while (pageToken);
  return documents;
}

function timestampSlug(date) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function assertArchiveMatchesSource(archive, users, studyGroups) {
  const expected = extractRetiredExamData({ users, studyGroups });
  if (JSON.stringify(archive.payload) !== JSON.stringify(expected)) {
    throw new Error('Archive verification failed: written payload differs from the live extraction.');
  }
  if (archive.payload.counts.usersScanned !== users.length || archive.payload.counts.groupsScanned !== studyGroups.length) {
    throw new Error('Archive verification failed: source document counts changed during export.');
  }
}

async function main() {
  const token = firebaseAccessToken();
  const [users, studyGroups] = await Promise.all([
    listDocuments('users', token),
    listDocuments('study_groups', token),
  ]);
  const archivedAt = new Date();
  const payload = extractRetiredExamData({ users, studyGroups });
  const archive = {
    schemaVersion: 1,
    projectId: PROJECT_ID,
    databaseId: DATABASE_ID,
    archivedAt: archivedAt.toISOString(),
    sourceCollections: ['users', 'study_groups'],
    firestoreValueEncoding: 'google.firestore.v1.Value JSON',
    payload,
  };

  const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
  const repositoryRoot = path.resolve(scriptDirectory, '..');
  const archiveRoot = process.env.SANCTRA_PRIVATE_ARCHIVE_ROOT
    ? path.resolve(process.env.SANCTRA_PRIVATE_ARCHIVE_ROOT)
    : path.resolve(repositoryRoot, '..', 'StudyTimer-private-archives', 'exam-retirement');
  const outputDirectory = path.join(archiveRoot, timestampSlug(archivedAt));
  await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
  await chmod(archiveRoot, 0o700);
  await chmod(outputDirectory, 0o700);

  const archivePath = path.join(outputDirectory, 'retired-exam-data.firestore.json');
  const archiveContents = `${JSON.stringify(archive, null, 2)}\n`;
  await writeFile(archivePath, archiveContents, { mode: 0o600, flag: 'wx' });
  await chmod(archivePath, 0o600);

  const writtenContents = await readFile(archivePath, 'utf8');
  const writtenArchive = JSON.parse(writtenContents);
  assertArchiveMatchesSource(writtenArchive, users, studyGroups);
  const checksum = sha256(writtenContents);
  const archiveStats = await stat(archivePath);
  if ((archiveStats.mode & 0o777) !== 0o600) throw new Error('Archive verification failed: data file permissions are not 0600.');

  const manifest = {
    schemaVersion: 1,
    projectId: PROJECT_ID,
    databaseId: DATABASE_ID,
    archivedAt: archivedAt.toISOString(),
    archiveFile: path.basename(archivePath),
    sha256: checksum,
    bytes: archiveStats.size,
    permissions: '0600',
    counts: payload.counts,
    verification: 'Parsed after write; payload matched the live extraction; SHA-256 recorded.',
  };
  const manifestPath = path.join(outputDirectory, 'manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  await chmod(manifestPath, 0o600);

  console.log(JSON.stringify({ outputDirectory, manifestPath, ...manifest }, null, 2));
}

await main();
