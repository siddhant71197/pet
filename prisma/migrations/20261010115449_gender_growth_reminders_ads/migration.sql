-- AlterTable
ALTER TABLE "InsuranceLead" ADD COLUMN "adProvider" TEXT;
ALTER TABLE "InsuranceLead" ADD COLUMN "browserId" TEXT;

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "dueAt" DATETIME NOT NULL,
    "timeOfDay" TEXT,
    "recurrence" TEXT NOT NULL DEFAULT 'none',
    "intervalDays" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "snoozedUntil" DATETIME,
    "lastCompletedAt" DATETIME,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reminder_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "petId" TEXT,
    "browserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "browserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ageMonths" INTEGER NOT NULL,
    "sizeClass" TEXT NOT NULL,
    "weightKg" REAL,
    "breed" TEXT,
    "notes" TEXT,
    "gender" TEXT NOT NULL DEFAULT 'unknown',
    "neutered" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Pet" ("ageMonths", "breed", "browserId", "createdAt", "id", "name", "notes", "sizeClass", "type", "weightKg") SELECT "ageMonths", "breed", "browserId", "createdAt", "id", "name", "notes", "sizeClass", "type", "weightKg" FROM "Pet";
DROP TABLE "Pet";
ALTER TABLE "new_Pet" RENAME TO "Pet";
CREATE INDEX "Pet_browserId_idx" ON "Pet"("browserId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Reminder_petId_dueAt_idx" ON "Reminder"("petId", "dueAt");

-- CreateIndex
CREATE INDEX "AdEvent_adId_type_idx" ON "AdEvent"("adId", "type");
