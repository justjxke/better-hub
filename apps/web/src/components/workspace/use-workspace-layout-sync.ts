"use client";

import { useCallback, useMemo } from "react";
import { DEFAULT_WORKSPACE_LAYOUT, type WorkspaceLayoutState } from "./workspace-types";
import { useWorkspaceTabs } from "./workspace-provider";

export function useWorkspaceLayoutSync() {
	const { tabs, activeTabId, updateTabLayout, updateActiveTabLayout } = useWorkspaceTabs();

	const resolvedActiveTabId = activeTabId ?? tabs[0]?.id ?? null;

	const activeLayout = useMemo<WorkspaceLayoutState>(() => {
		if (!resolvedActiveTabId) return { ...DEFAULT_WORKSPACE_LAYOUT };
		const tab = tabs.find((entry) => entry.id === resolvedActiveTabId);
		return tab?.layout ?? { ...DEFAULT_WORKSPACE_LAYOUT };
	}, [resolvedActiveTabId, tabs]);

	const getLayoutForTab = useCallback(
		(tabId: string): WorkspaceLayoutState => {
			const tab = tabs.find((entry) => entry.id === tabId);
			return tab?.layout ?? { ...DEFAULT_WORKSPACE_LAYOUT };
		},
		[tabs],
	);

	return {
		activeTabId: resolvedActiveTabId,
		activeLayout,
		leftSidebarOpen: activeLayout.leftSidebarOpen,
		leftSidebarWidth: activeLayout.leftSidebarWidth,
		rightSidebarOpen: activeLayout.rightSidebarOpen,
		rightSidebarWidth: activeLayout.rightSidebarWidth,
		getLayoutForTab,
		updateTabLayout,
		updateActiveLayout: updateActiveTabLayout,
	};
}
