"use client";

import { ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useWorkspaceTabs } from "@/components/workspace/workspace-provider";
import type { WorkspaceFolder, WorkspaceTab } from "@/components/workspace/workspace-types";
import { cn } from "@/lib/utils";
import { WorkspaceFolderContextMenu } from "./workspace-folder-context-menu";
import {
	getWorkspaceFolderIconComponent,
	WorkspaceFolderEditPopover,
} from "./workspace-folder-edit-popover";
import { WorkspaceTabContextMenu } from "./workspace-tab-context-menu";

interface WorkspaceStripItemProps {
	tab: WorkspaceTab;
	active: boolean;
	onSelect: (tab: WorkspaceTab) => void;
}

function resolveNextTabHrefAfterClose(
	tabs: WorkspaceTab[],
	activeTabId: string | null,
	mru: string[],
	closingTabId: string,
): string | null {
	const nextTabs = tabs.filter((tab) => tab.id !== closingTabId);
	if (nextTabs.length === 0) return null;

	const nextActiveId =
		activeTabId === closingTabId
			? (mru.find(
					(id) =>
						id !== closingTabId &&
						nextTabs.some((tab) => tab.id === id),
				) ??
				nextTabs[0]?.id ??
				null)
			: activeTabId;

	if (!nextActiveId) return nextTabs[0]?.href ?? null;
	return nextTabs.find((tab) => tab.id === nextActiveId)?.href ?? nextTabs[0]?.href ?? null;
}

export function WorkspaceStripItem({ tab, active, onSelect }: WorkspaceStripItemProps) {
	const router = useRouter();
	const pathname = usePathname();
	const {
		tabs,
		folders,
		activeTabId,
		mru,
		duplicateTab,
		closeTab,
		closeOtherTabs,
		moveTabToFolder,
		addTabToNewFolder,
	} = useWorkspaceTabs();

	const handleDuplicateTab = () => {
		duplicateTab(tab.id);
		if (pathname !== tab.href) {
			router.push(tab.href);
		}
	};

	const handleCloseTab = () => {
		const nextHref = resolveNextTabHrefAfterClose(tabs, activeTabId, mru, tab.id);
		closeTab(tab.id);
		if (nextHref && pathname !== nextHref) {
			router.push(nextHref);
		}
	};

	const handleCloseOtherTabs = () => {
		closeOtherTabs(tab.id);
		if (pathname !== tab.href) {
			router.push(tab.href);
		}
	};

	return (
		<WorkspaceTabContextMenu
			tab={tab}
			folders={folders}
			onDuplicate={handleDuplicateTab}
			onClose={handleCloseTab}
			onCloseOthers={handleCloseOtherTabs}
			onMoveToFolder={(folderId) => moveTabToFolder(tab.id, folderId)}
			onAddToNewFolder={() => {
				addTabToNewFolder(tab.id);
			}}
		>
			<button
				type="button"
				onClick={() => onSelect(tab)}
				className={cn(
					"shrink-0 max-w-56 truncate rounded-md border px-2.5 py-1.5 text-xs transition-colors",
					active
						? "border-foreground/20 bg-muted text-foreground"
						: "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50",
				)}
				title={tab.title || tab.href}
			>
				{tab.title}
			</button>
		</WorkspaceTabContextMenu>
	);
}

interface WorkspaceStripFolderItemProps {
	folder: WorkspaceFolder;
	expanded: boolean;
	onToggle: (folder: WorkspaceFolder, expanded: boolean) => void;
}

export function WorkspaceStripFolderItem({
	folder,
	expanded,
	onToggle,
}: WorkspaceStripFolderItemProps) {
	const { updateFolderMeta, deleteFolderKeepTabs, deleteFolderRemoveTabs } =
		useWorkspaceTabs();
	const FolderIcon = getWorkspaceFolderIconComponent(folder.icon);

	return (
		<WorkspaceFolderContextMenu
			onDeleteKeepTabs={() => deleteFolderKeepTabs(folder.id)}
			onDeleteRemoveTabs={() => deleteFolderRemoveTabs(folder.id)}
		>
			<div className="flex items-center gap-1 rounded-md border border-border px-1.5 py-1 text-xs text-muted-foreground">
				<WorkspaceFolderEditPopover
					folder={folder}
					onUpdate={(patch) => updateFolderMeta(folder.id, patch)}
				>
					<button
						type="button"
						className={cn(
							"inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors",
							"border-border hover:bg-muted/50 hover:text-foreground",
						)}
						title="Edit folder"
					>
						<FolderIcon className="size-3.5" />
					</button>
				</WorkspaceFolderEditPopover>
				<button
					type="button"
					onClick={() => onToggle(folder, !expanded)}
					className="inline-flex min-w-0 flex-1 items-center gap-1 rounded-md px-1.5 py-1 text-left text-foreground hover:bg-muted/40"
				>
					<ChevronRight
						className={cn(
							"size-3 transition-transform",
							expanded && "rotate-90",
						)}
					/>
					<span className="truncate">{folder.name}</span>
				</button>
			</div>
		</WorkspaceFolderContextMenu>
	);
}
