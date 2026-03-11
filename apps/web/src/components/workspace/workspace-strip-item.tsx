"use client";

import {
	FileCode2,
	FolderGit2,
	GitBranch,
	GitPullRequest,
	LayoutGrid,
	MessageSquareText,
	Search,
	CircleDot,
	Circle,
	CheckCircle2,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useWorkspaceTabs } from "@/components/workspace/workspace-provider";
import type { WorkspaceFolder, WorkspaceTab } from "@/components/workspace/workspace-types";
import { classifyWorkspaceRoute } from "@/lib/workspace-route";
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
	folderTintColor?: string;
}

type TabVisualStatus = {
	label: string;
	tone: "neutral" | "success" | "destructive" | "muted";
} | null;

const FOLDER_TINT_STYLES: Record<string, string> = {
	slate: "border-slate-400/25 bg-slate-400/10 text-slate-100 hover:bg-slate-400/14 dark:border-slate-400/22 dark:bg-slate-400/10",
	blue: "border-blue-400/30 bg-blue-400/11 text-blue-50 hover:bg-blue-400/15 dark:border-blue-400/28 dark:bg-blue-400/10",
	emerald: "border-emerald-400/30 bg-emerald-400/11 text-emerald-50 hover:bg-emerald-400/15 dark:border-emerald-400/28 dark:bg-emerald-400/10",
	amber: "border-amber-400/34 bg-amber-400/14 text-amber-50 hover:bg-amber-400/18 dark:border-amber-400/30 dark:bg-amber-400/12",
	rose: "border-rose-400/30 bg-rose-400/12 text-rose-50 hover:bg-rose-400/16 dark:border-rose-400/28 dark:bg-rose-400/10",
	violet: "border-violet-400/30 bg-violet-400/12 text-violet-50 hover:bg-violet-400/16 dark:border-violet-400/28 dark:bg-violet-400/10",
};

const FOLDER_ACCENT_STYLES: Record<string, string> = {
	slate: "bg-slate-400 text-slate-950",
	blue: "bg-blue-400 text-blue-950",
	emerald: "bg-emerald-400 text-emerald-950",
	amber: "bg-amber-400 text-amber-950",
	rose: "bg-rose-400 text-rose-950",
	violet: "bg-violet-400 text-violet-950",
};

const STATUS_TONE_STYLES: Record<NonNullable<TabVisualStatus>["tone"], string> = {
	neutral: "bg-blue-400/14 text-blue-200 ring-1 ring-inset ring-blue-400/20",
	success: "bg-emerald-400/14 text-emerald-200 ring-1 ring-inset ring-emerald-400/24",
	destructive: "bg-rose-400/14 text-rose-200 ring-1 ring-inset ring-rose-400/22",
	muted: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
};

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

function getKindIcon(tab: WorkspaceTab) {
	switch (tab.kind) {
		case "pull":
			return GitPullRequest;
		case "issue":
			return CircleDot;
		case "discussion":
			return MessageSquareText;
		case "actions":
			return GitBranch;
		case "search":
			return Search;
		case "file":
			return FileCode2;
		case "dashboard":
			return LayoutGrid;
		default:
			return FolderGit2;
	}
}

function getTabStatus(tab: WorkspaceTab): TabVisualStatus {
	const context = tab.context;
	if (tab.kind === "pull") {
		if (context?.merged === true || typeof context?.mergedAt === "string") {
			return { label: "Merged", tone: "success" };
		}
		if (context?.draft === true || context?.isDraft === true) {
			return { label: "Draft", tone: "muted" };
		}
		if (context?.state === "closed") {
			return { label: "Closed", tone: "destructive" };
		}
		if (context?.state === "open") {
			return { label: "Open", tone: "neutral" };
		}
		return null;
	}

	if (tab.kind === "issue") {
		if (context?.state === "closed") {
			return { label: "Closed", tone: "destructive" };
		}
		if (context?.state === "open") {
			return { label: "Open", tone: "success" };
		}
		return null;
	}

	return null;
}

function getTabDisplayMeta(tab: WorkspaceTab) {
	const route = classifyWorkspaceRoute(tab.href);
	const status = getTabStatus(tab);

	if (tab.kind === "pull") {
		return {
			primary: `PR #${route.number ?? "?"}`,
			secondary: null,
			status,
		};
	}

	if (tab.kind === "issue") {
		return {
			primary: `Issue #${route.number ?? "?"}`,
			secondary: null,
			status,
		};
	}

	if (tab.kind === "discussion") {
		return {
			primary: `Discussion #${route.number ?? "?"}`,
			secondary: null,
			status,
		};
	}

	if (tab.kind === "file") {
		return {
			primary: tab.title,
			secondary: null,
			status: null,
		};
	}

	if (tab.kind === "repo") {
		return {
			primary: route.repo ?? tab.title,
			secondary: null,
			status: null,
		};
	}

	return {
		primary: tab.title,
		secondary: null,
		status,
	};
}

export function WorkspaceStripItem({
	tab,
	active,
	onSelect,
	folderTintColor,
}: WorkspaceStripItemProps) {
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
	const KindIcon = useMemo(() => getKindIcon(tab), [tab]);
	const meta = useMemo(() => getTabDisplayMeta(tab), [tab]);
	const tintStyles =
		folderTintColor && FOLDER_TINT_STYLES[folderTintColor]
			? FOLDER_TINT_STYLES[folderTintColor]
			: null;

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
					"group shrink-0 max-w-60 rounded-lg border px-2 py-1.5 text-left transition-all",
					"hover:-translate-y-px hover:text-foreground",
					active
						? "border-foreground/14 bg-muted/80 text-foreground shadow-sm"
						: "border-border/60 bg-background/70 text-muted-foreground hover:border-border/90 hover:bg-muted/35",
					tintStyles,
				)}
				title={tab.title || tab.href}
			>
				<div className="flex items-center gap-2">
					<div
						className={cn(
							"inline-flex size-5 shrink-0 items-center justify-center rounded-md border text-[11px] transition-colors",
							active
								? "border-foreground/12 bg-background/80 text-foreground"
								: "border-border/60 bg-muted/30 text-muted-foreground group-hover:text-foreground",
							folderTintColor &&
								"border-current/10 bg-background/65",
						)}
					>
						<KindIcon className="size-3.25" />
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1.5">
							<span className="truncate text-[11px] font-medium leading-4 text-foreground">
								{meta.primary}
							</span>
							{meta.status ? (
								<span
									className={cn(
										"inline-flex shrink-0 items-center gap-1 rounded-md px-1.25 py-0.5 text-[9px] font-medium leading-none",
										STATUS_TONE_STYLES[
											meta.status
												.tone
										],
									)}
								>
									{meta.status.tone ===
									"success" ? (
										<CheckCircle2 className="size-2.5" />
									) : meta.status.tone ===
									  "destructive" ? (
										<Circle className="size-2.5 fill-current" />
									) : (
										<CircleDot className="size-2.5" />
									)}
									{meta.status.label}
								</span>
							) : null}
						</div>
					</div>
				</div>
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
	const [editOpen, setEditOpen] = useState(false);
	const FolderIcon = getWorkspaceFolderIconComponent(folder.icon);
	const tintStyles = FOLDER_TINT_STYLES[folder.color] ?? FOLDER_TINT_STYLES.slate;
	const accentStyles = FOLDER_ACCENT_STYLES[folder.color] ?? FOLDER_ACCENT_STYLES.slate;

	return (
		<WorkspaceFolderContextMenu
			onRename={() => setEditOpen(true)}
			onDeleteKeepTabs={() => deleteFolderKeepTabs(folder.id)}
			onDeleteRemoveTabs={() => deleteFolderRemoveTabs(folder.id)}
		>
			<div
				className={cn(
					"flex items-center gap-1 rounded-lg border px-1.5 py-1 text-xs shadow-sm transition-colors",
					tintStyles,
					expanded && "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
				)}
			>
				<WorkspaceFolderEditPopover
					folder={folder}
					onUpdate={(patch) => updateFolderMeta(folder.id, patch)}
					open={editOpen}
					onOpenChange={setEditOpen}
				>
					<button
						type="button"
						className={cn(
							"inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-background/50 transition-colors hover:bg-background/70",
							accentStyles,
						)}
						title="Edit folder"
					>
						<FolderIcon className="size-3.5" />
					</button>
				</WorkspaceFolderEditPopover>
				<button
					type="button"
					onClick={() => onToggle(folder, !expanded)}
					className="inline-flex min-w-0 flex-1 items-center rounded-md px-2 py-0.75 text-left"
				>
					<div className="min-w-0">
						<div className="truncate text-[11px] font-medium leading-4 text-foreground">
							{folder.name}
						</div>
					</div>
				</button>
			</div>
		</WorkspaceFolderContextMenu>
	);
}
