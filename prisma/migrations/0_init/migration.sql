-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL,
    "browserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ageMonths" INTEGER NOT NULL,
    "sizeClass" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "breed" TEXT,
    "notes" TEXT,
    "gender" TEXT NOT NULL DEFAULT 'unknown',
    "neutered" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "goal" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "zipcode" TEXT NOT NULL,
    "petId" TEXT,
    "sourceAd" TEXT,
    "adProvider" TEXT,
    "browserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsuranceLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "timeOfDay" TEXT,
    "recurrence" TEXT NOT NULL DEFAULT 'none',
    "intervalDays" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "snoozedUntil" TIMESTAMP(3),
    "lastCompletedAt" TIMESTAMP(3),
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdEvent" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "petId" TEXT,
    "browserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pet_browserId_idx" ON "Pet"("browserId");

-- CreateIndex
CREATE INDEX "Plan_petId_idx" ON "Plan"("petId");

-- CreateIndex
CREATE INDEX "Reminder_petId_dueAt_idx" ON "Reminder"("petId", "dueAt");

-- CreateIndex
CREATE INDEX "AdEvent_adId_type_idx" ON "AdEvent"("adId", "type");

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

