-- CreateTable
CREATE TABLE "PlaybookCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "completed" BOOLEAN NOT NULL DEFAULT true,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    CONSTRAINT "PlaybookCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlaybookCompletion_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "PlaybookScript" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PlaybookCompletion_userId_scriptId_key" ON "PlaybookCompletion"("userId", "scriptId");
