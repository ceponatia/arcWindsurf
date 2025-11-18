-- CreateTable CharacterInstance and SettingInstance for per-session overrides

-- CreateTable: CharacterInstance
CREATE TABLE "CharacterInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "templateCharacterId" TEXT NOT NULL,
    "baseline" TEXT NOT NULL,
    "overrides" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CharacterInstance_sessionId_fkey" FOREIGN KEY ("sessionId")
      REFERENCES "UserSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: SettingInstance
CREATE TABLE "SettingInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "templateSettingId" TEXT NOT NULL,
    "baseline" TEXT NOT NULL,
    "overrides" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SettingInstance_sessionId_fkey" FOREIGN KEY ("sessionId")
      REFERENCES "UserSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes for CharacterInstance
CREATE UNIQUE INDEX "CharacterInstance_sessionId_templateCharacterId_key"
  ON "CharacterInstance" ("sessionId", "templateCharacterId");
CREATE INDEX "CharacterInstance_sessionId_idx"
  ON "CharacterInstance" ("sessionId");

-- Indexes for SettingInstance
CREATE UNIQUE INDEX "SettingInstance_sessionId_templateSettingId_key"
  ON "SettingInstance" ("sessionId", "templateSettingId");
CREATE INDEX "SettingInstance_sessionId_idx"
  ON "SettingInstance" ("sessionId");
