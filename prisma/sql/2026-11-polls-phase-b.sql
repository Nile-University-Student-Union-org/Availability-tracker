-- Phase B (contract). Run only once the NEW code is live on main:
-- removes the pollId defaults, the old one-answer-per-slot uniques and the old schedule tables.
BEGIN;

ALTER TABLE availability ALTER COLUMN "pollId" DROP DEFAULT;
ALTER TABLE recurring_availability ALTER COLUMN "pollId" DROP DEFAULT;

-- Prisma made the old per-user uniques as indexes, and unquoted names fold to lowercase, so drop them by quoted name
ALTER TABLE availability DROP CONSTRAINT IF EXISTS "availability_userId_date_startTime_key";
DROP INDEX IF EXISTS "availability_userId_date_startTime_key";
ALTER TABLE recurring_availability DROP CONSTRAINT IF EXISTS "recurring_availability_userId_dayOfWeek_startTime_key";
DROP INDEX IF EXISTS "recurring_availability_userId_dayOfWeek_startTime_key";

DROP TABLE IF EXISTS weekly_slot_config;
DROP TABLE IF EXISTS time_slot_config;
DROP TABLE IF EXISTS schedule_config;
COMMIT;
