-- CreateTable
CREATE TABLE "schedule_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "slotMode" TEXT NOT NULL DEFAULT 'fixed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_slot_config" (
    "id" TEXT NOT NULL,
    "scheduleConfigId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_slot_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "time_slot_config_scheduleConfigId_idx" ON "time_slot_config"("scheduleConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "time_slot_config_scheduleConfigId_startTime_key" ON "time_slot_config"("scheduleConfigId", "startTime");

-- AddForeignKey
ALTER TABLE "time_slot_config" ADD CONSTRAINT "time_slot_config_scheduleConfigId_fkey" FOREIGN KEY ("scheduleConfigId") REFERENCES "schedule_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;
