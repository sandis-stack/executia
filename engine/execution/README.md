# Engine · execution

Invoice advancement and **Execution Complete** policy.

- `completion.js` — Engine truth established ≠ Execution Complete
- Complete only when every required consequence satisfies policy (accounting sync, payment settlement, etc.)
- Temporary sync failure → remain `executing` for automatic retry
- Auth/config problems → `needs_decision` (no vendor names in the prompt)
