-- Reset Drizzle migration tracking after squashing migrations.
-- Run this on production AFTER deploying the squashed migration files.
-- This replaces all previous migration entries with a single entry
-- for the squashed 0000_initial.sql migration.

DELETE FROM drizzle.__drizzle_migrations;

INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at")
VALUES ('2e0098583f128ce5b79d8730f6d0065956a42bc624a4a0fffbef4f2c6d9cdc65', 1772753495871);
