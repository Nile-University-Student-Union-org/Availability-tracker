BEGIN;

CREATE TABLE IF NOT EXISTS poll (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  "allCommittees" BOOLEAN NOT NULL DEFAULT FALSE,
  committees TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "requestedCommittees" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "requestStatus" TEXT,
  "rejectionReason" TEXT,
  "createdById" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "startDate" DATE,
  "endDate" DATE,
  "slotMode" TEXT NOT NULL DEFAULT 'fixed',
  "weeklyDays" INTEGER[] NOT NULL DEFAULT ARRAY[0,1,2,3,4]::INTEGER[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE IF NOT EXISTS poll_time_slot (
  id TEXT PRIMARY KEY,
  "pollId" TEXT NOT NULL REFERENCES poll(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS poll_weekly_slot (
  id TEXT PRIMARY KEY,
  "pollId" TEXT NOT NULL REFERENCES poll(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS poll_time_slot_pollId_startTime_key ON poll_time_slot("pollId", "startTime");
CREATE INDEX IF NOT EXISTS poll_time_slot_pollId_idx ON poll_time_slot("pollId");
-- Custom slot lengths: null endTime means one hour after startTime
ALTER TABLE poll_time_slot ADD COLUMN IF NOT EXISTS "endTime" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS poll_weekly_slot_pollId_dayOfWeek_startTime_key ON poll_weekly_slot("pollId", "dayOfWeek", "startTime");
CREATE INDEX IF NOT EXISTS poll_weekly_slot_pollId_idx ON poll_weekly_slot("pollId");

DO $$ BEGIN
  IF to_regclass('public.schedule_config') IS NOT NULL THEN
    INSERT INTO poll (id, name, type, active, "allCommittees", "requestStatus", "startDate", "endDate", "slotMode", "weeklyDays", "createdAt", "updatedAt")
    SELECT 'legacy-date', COALESCE(NULLIF("dateScheduleTitle", ''), 'Specific Date Availability'), 'date', "dateScheduleActive", TRUE, NULL, "startDate", "endDate", "slotMode", "weeklyDays", "createdAt", "updatedAt"
    FROM schedule_config WHERE id = 'default' ON CONFLICT (id) DO NOTHING;

    INSERT INTO poll (id, name, type, active, "allCommittees", "requestStatus", "slotMode", "weeklyDays", "createdAt", "updatedAt")
    SELECT 'legacy-weekly', COALESCE(NULLIF("weeklyScheduleTitle", ''), 'Semester Availability'), 'weekly', "weeklyScheduleActive", TRUE, NULL, "slotMode", "weeklyDays", "createdAt", "updatedAt"
    FROM schedule_config WHERE id = 'default' ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.time_slot_config') IS NOT NULL AND EXISTS (SELECT 1 FROM poll WHERE id = 'legacy-date') THEN
    INSERT INTO poll_time_slot (id, "pollId", "startTime", "createdAt")
    SELECT md5(random()::text || clock_timestamp()::text), 'legacy-date', "startTime", "createdAt"
    FROM time_slot_config WHERE "scheduleConfigId" = 'default'
    ON CONFLICT ("pollId", "startTime") DO NOTHING;
  END IF;
  IF to_regclass('public.weekly_slot_config') IS NOT NULL AND EXISTS (SELECT 1 FROM poll WHERE id = 'legacy-weekly') THEN
    INSERT INTO poll_weekly_slot (id, "pollId", "dayOfWeek", "startTime", "endTime", "createdAt")
    SELECT md5(random()::text || clock_timestamp()::text), 'legacy-weekly', "dayOfWeek", "startTime", "endTime", "createdAt"
    FROM weekly_slot_config WHERE "scheduleConfigId" = 'default'
    ON CONFLICT ("pollId", "dayOfWeek", "startTime") DO NOTHING;
    IF NOT EXISTS (SELECT 1 FROM poll_weekly_slot WHERE "pollId" = 'legacy-weekly') THEN
      INSERT INTO poll_weekly_slot (id, "pollId", "dayOfWeek", "startTime", "endTime")
      SELECT md5(random()::text || clock_timestamp()::text), 'legacy-weekly', days.day, slots."startTime",
        to_char((to_timestamp(slots."startTime", 'HH24:MI') + interval '1 hour')::time, 'HH24:MI')
      FROM schedule_config c
      CROSS JOIN LATERAL unnest(CASE WHEN c."weeklyIncludeSaturday" THEN ARRAY[0,1,2,3,4,6] ELSE ARRAY[0,1,2,3,4] END) AS days(day)
      CROSS JOIN LATERAL (
        SELECT "startTime" FROM time_slot_config WHERE "scheduleConfigId" = 'default'
        UNION ALL SELECT to_char(time '08:30' + n * interval '1 hour', 'HH24:MI')
          FROM generate_series(0, 8) n
          WHERE NOT EXISTS (SELECT 1 FROM time_slot_config WHERE "scheduleConfigId" = 'default')
      ) slots WHERE c.id = 'default';
    END IF;
  END IF;
END $$;

ALTER TABLE availability ADD COLUMN IF NOT EXISTS "pollId" TEXT;
UPDATE availability SET "pollId" = 'legacy-date' WHERE "pollId" IS NULL;
ALTER TABLE availability ALTER COLUMN "pollId" SET NOT NULL;
ALTER TABLE recurring_availability ADD COLUMN IF NOT EXISTS "pollId" TEXT;
UPDATE recurring_availability SET "pollId" = 'legacy-weekly' WHERE "pollId" IS NULL;
ALTER TABLE recurring_availability ALTER COLUMN "pollId" SET NOT NULL;

ALTER TABLE availability DROP CONSTRAINT IF EXISTS availability_userId_date_startTime_key;
ALTER TABLE availability ADD CONSTRAINT availability_pollId_fkey FOREIGN KEY ("pollId") REFERENCES poll(id) ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS availability_pollId_userId_date_startTime_key ON availability("pollId", "userId", date, "startTime");
CREATE INDEX IF NOT EXISTS availability_pollId_idx ON availability("pollId");
ALTER TABLE recurring_availability DROP CONSTRAINT IF EXISTS recurring_availability_userId_dayOfWeek_startTime_key;
ALTER TABLE recurring_availability ADD CONSTRAINT recurring_availability_pollId_fkey FOREIGN KEY ("pollId") REFERENCES poll(id) ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS recurring_availability_pollId_userId_dayOfWeek_startTime_key ON recurring_availability("pollId", "userId", "dayOfWeek", "startTime");
CREATE INDEX IF NOT EXISTS recurring_availability_pollId_idx ON recurring_availability("pollId");

DROP TABLE IF EXISTS weekly_slot_config;
DROP TABLE IF EXISTS time_slot_config;
DROP TABLE IF EXISTS schedule_config;

CREATE INDEX IF NOT EXISTS user_committee_idx ON "user"(committee);
CREATE INDEX IF NOT EXISTS user_role_idx ON "user"(role);
CREATE INDEX IF NOT EXISTS "poll_createdById_idx" ON poll("createdById");
CREATE INDEX IF NOT EXISTS "poll_requestStatus_idx" ON poll("requestStatus");
COMMIT;
