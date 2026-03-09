-- AlterTable
ALTER TABLE "user_settings"
ADD COLUMN "workspaceNewTabBehavior" TEXT NOT NULL DEFAULT 'dashboard';

-- Add check constraint
ALTER TABLE "user_settings"
ADD CONSTRAINT "user_settings_workspaceNewTabBehavior_check"
CHECK ("workspaceNewTabBehavior" IN ('dashboard', 'duplicate'));
