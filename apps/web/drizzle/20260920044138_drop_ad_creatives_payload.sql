-- Second half of the previous migration: every field the payload carried now
-- has a column or a translations row, and nothing reads the JSONB any more.
ALTER TABLE "ad_creatives" DROP COLUMN "payload";