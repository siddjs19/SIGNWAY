# Content and data notes

- Actual MP4 files packaged: 151
- Dynamic inventory entries: 151
- Seeded lesson modules: 8
- Seeded lessons only include terms whose MP4 files actually exist in the supplied archive.
- Seed script is idempotent and uses `$setOnInsert`; it does not wipe the database.
- Lesson sign records are marked as requiring educator review; do not claim linguistic verification.
- Practitioner cards are explicitly illustrative; requests are stored as pending user-owned records.
- Conversation history is stored only when the account preference allows it; temporary conversations are not returned in saved-history lists.
