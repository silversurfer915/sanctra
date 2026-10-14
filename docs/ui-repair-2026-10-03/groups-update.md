# Groups update

Existing live group membership, message storage, quotas and moderation rules are retained.

- Conversation bubbles align own messages right, other messages left.
- Multiline composer, Enter to send, Shift+Enter for newline, inline @ member suggestions with keyboard selection.
- Account/group-scoped local text drafts survive reload; send failures preserve the draft.
- Replies are quoted text compatible with old clients and the existing 200-character message limit.
- Search recent messages and sender names; copy message text; date separators; removal confirmation.
- Incoming messages preserve the reader's scroll position and expose a new-message jump button.
- Group search, member search and online/focusing filters.
- Group create modal Escape handler repaired; Plus-only creation controls use current entitlement.
- Sidebar-only aura glow tightened without changing larger avatar auras.

Validation: 106 unit tests pass; production build passes. The actual conversation component was exercised with sample messages in a local isolated preview: member autocomplete/Enter, direction of bubbles, quoted reply, search, draft reload and removal confirmation. At 1024px there was no horizontal overflow. No messages or memberships were written to production during verification. Shared backend quota and moderation behavior remains covered by existing Firestore tests; no rule schema changes needed.
