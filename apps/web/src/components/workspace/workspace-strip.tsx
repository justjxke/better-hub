"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useWorkspaceDnd } from "@/components/workspace/use-workspace-dnd";
import { useWorkspaceTabs } from "@/components/workspace/workspace-provider";
import type { WorkspaceTab } from "@/components/workspace/workspace-types";
import { cn } from "@/lib/utils";
import { WorkspaceStripFolderItem, WorkspaceStripItem } from "./workspace-strip-item";

type WorkspaceNewTabBehavior = "dashboard" | "duplicate";

interface UserSettingsResponse {
	workspaceNewTabBehavior?: string;
}

export function WorkspaceStrip() {
	const router = useRouter();
	const pathname = usePathname();
	const {
		stripOpen,
		tabs,
		folders,
		activeTabId,
		activateTab,
		openHrefInNewTab,
		duplicateCurrentTab,
		setFolderExpanded,
		applyWorkspaceDndIntent,
	} = useWorkspaceTabs();
	const [newTabBehavior, setNewTabBehavior] = useState<WorkspaceNewTabBehavior>("dashboard");
	const {
		draggingTabId,
		getTabDragHandlers,
		getReorderDropHandlers,
		getTabDropHandlers,
		getFolderDropHandlers,
	} = useWorkspaceDnd({ onIntent: applyWorkspaceDndIntent });

	useEffect(() => {
		let cancelled = false;

		fetch("/api/user-settings")
			.then(async (response) => {
				if (!response.ok) return;
				const data = (await response.json()) as UserSettingsResponse;
				if (cancelled) return;
				setNewTabBehavior(
					data.workspaceNewTabBehavior === "duplicate"
						? "duplicate"
						: "dashboard",
				);
			})
			.catch(() => {});

		return () => {
			cancelled = true;
		};
	}, []);

	const { rootTabs, sortedFolders, tabsByFolderId } = useMemo(() => {
		const sortedTabs = [...tabs].sort((a, b) => a.position - b.position);
		const sorted = [...folders].sort((a, b) => a.position - b.position);
		const folderIds = new Set(sorted.map((folder) => folder.id));
		const grouped = new Map<string, WorkspaceTab[]>();
		const root: WorkspaceTab[] = [];

		for (const tab of sortedTabs) {
			const folderId = tab.parentFolderId;
			if (folderId && folderIds.has(folderId)) {
				const folderTabs = grouped.get(folderId) ?? [];
				folderTabs.push(tab);
				grouped.set(folderId, folderTabs);
				continue;
			}
			root.push(tab);
		}

		return {
			rootTabs: root,
			sortedFolders: sorted,
			tabsByFolderId: grouped,
		};
	}, [tabs, folders]);

	if (!stripOpen) return null;

	const handleSelectTab = (tab: WorkspaceTab) => {
		activateTab(tab.id);
		if (pathname !== tab.href) {
			router.push(tab.href);
		}
	};

	const handleAddTab = () => {
		if (newTabBehavior === "duplicate") {
			const currentTab =
				tabs.find((tab) => tab.id === activeTabId) ??
				tabs.find((tab) => tab.href === pathname);

			if (!currentTab) {
				openHrefInNewTab("/dashboard");
				if (pathname !== "/dashboard") {
					router.push("/dashboard");
				}
				return;
			}

			duplicateCurrentTab();
			if (pathname !== currentTab.href) {
				router.push(currentTab.href);
			}
			return;
		}

		openHrefInNewTab("/dashboard");
		if (pathname !== "/dashboard") {
			router.push("/dashboard");
		}
	};

	return (
		<div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-background/95 px-2 py-1.5 sm:px-4">
			{rootTabs.map((tab) => (
				<Fragment key={`root-${tab.id}`}>
					<div
						{...getReorderDropHandlers(tab.id)}
						className="h-7 w-2.5 shrink-0 rounded-sm"
					/>
					<div
						{...getTabDragHandlers(tab.id)}
						{...getTabDropHandlers(tab.id)}
						className={cn(
							"shrink-0",
							draggingTabId === tab.id && "opacity-60",
						)}
					>
						<WorkspaceStripItem
							tab={tab}
							active={tab.id === activeTabId}
							onSelect={handleSelectTab}
						/>
					</div>
				</Fragment>
			))}
			<div
				{...getReorderDropHandlers(null)}
				className="h-7 w-2.5 shrink-0 rounded-sm"
			/>
			{sortedFolders.map((folder) => {
				const expanded = !folder.collapsed;
				const folderTabs = tabsByFolderId.get(folder.id) ?? [];
				const activeChildTab =
					folderTabs.find((tab) => tab.id === activeTabId) ?? null;
				const visibleFolderTabs = expanded
					? folderTabs
					: activeChildTab
						? [activeChildTab]
						: [];

				return (
					<div key={folder.id} className="flex items-center gap-1">
						<div {...getFolderDropHandlers(folder.id)}>
							<WorkspaceStripFolderItem
								folder={folder}
								expanded={expanded}
								onToggle={(_, nextExpanded) =>
									setFolderExpanded(
										folder.id,
										nextExpanded,
									)
								}
							/>
						</div>
						{visibleFolderTabs.map((tab) => (
							<div
								key={tab.id}
								{...getTabDragHandlers(tab.id)}
								{...getTabDropHandlers(tab.id)}
								className={cn(
									"shrink-0",
									draggingTabId === tab.id &&
										"opacity-60",
								)}
							>
								<WorkspaceStripItem
									tab={tab}
									active={
										tab.id ===
										activeTabId
									}
									onSelect={handleSelectTab}
									folderTintColor={
										folder.color
									}
								/>
							</div>
						))}
					</div>
				);
			})}
			<button
				type="button"
				onClick={handleAddTab}
				className={cn(
					"shrink-0 rounded-md border border-border p-1.5 text-muted-foreground transition-colors",
					"hover:bg-muted/50 hover:text-foreground",
				)}
				title="New workspace tab"
			>
				<Plus className="h-3.5 w-3.5" />
			</button>
		</div>
	);
}
