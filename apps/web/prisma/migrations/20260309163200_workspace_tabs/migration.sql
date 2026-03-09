-- CreateTable
CREATE TABLE "workspace_tabs" (
    "userId" TEXT NOT NULL,
    "tabId" TEXT NOT NULL,
    "parentFolderId" TEXT,
    "title" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "icon" TEXT,
    "contextJson" TEXT,
    "layoutJson" TEXT,
    "position" INTEGER NOT NULL,
    "lastActiveAt" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "workspace_tabs_pkey" PRIMARY KEY ("userId", "tabId")
);

-- CreateTable
CREATE TABLE "workspace_folders" (
    "userId" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "collapsed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "workspace_folders_pkey" PRIMARY KEY ("userId", "folderId")
);

-- CreateTable
CREATE TABLE "workspace_state" (
    "userId" TEXT NOT NULL,
    "stripOpen" BOOLEAN NOT NULL DEFAULT false,
    "activeTabId" TEXT,
    "mruJson" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "workspace_state_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "workspace_tabs_userId_position_idx" ON "workspace_tabs"("userId", "position");

-- CreateIndex
CREATE INDEX "workspace_tabs_userId_parentFolderId_position_idx" ON "workspace_tabs"("userId", "parentFolderId", "position");

-- CreateIndex
CREATE INDEX "workspace_folders_userId_position_idx" ON "workspace_folders"("userId", "position");
