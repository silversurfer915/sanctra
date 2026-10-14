# Retired exam-data archive receipt

- Production project: `studyapp-4137d` / `(default)`
- Exported at: `2026-10-09T14:06:26.170Z`
- Private local archive: `/Users/ponhareeshn/Documents/StudyTimer-private-archives/exam-retirement/2026-10-09T14-06-26-170Z/`
- Archive file: `retired-exam-data.firestore.json`
- SHA-256: `41aea3550d087fc0695c16c55ccec80143d277c696a28e593c4b3a5737e5670e`
- File permissions: `0600`; containing directories: `0700`
- Records scanned: 34 user documents and 12 study-group documents
- Records archived: 34 user documents and 12 study-group documents
- Archived dependency links: 3 session-to-exam-goal links

The export contains only retired exam/grade fields and the minimum identifiers needed to restore their positions. It retains Firestore's typed JSON values, document paths, create/update timestamps, workspace exam targets, study grade/coaching fields, group target-exam fields, and session goal links. It does not include unrelated task text, group names, sessions without goal links, or other account data.

Verification performed immediately after writing:

1. Parsed the saved JSON successfully.
2. Re-extracted the live production fields and compared the complete payload byte-for-byte at the JSON structure level.
3. Confirmed source and archive record counts.
4. Recorded the archive SHA-256 and verified restrictive filesystem permissions.

The archive is intentionally outside Git and must remain private. The export script is read-only: it does not update or delete Firestore records.
