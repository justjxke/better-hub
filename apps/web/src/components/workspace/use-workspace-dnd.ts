"use client";

import { useCallback, useState, type DragEventHandler } from "react";
import type { WorkspaceFolder, WorkspaceSession, WorkspaceTab } from "./workspace-types";

export type WorkspaceDndIntent =
	| { type: "reorder-top-level"; tabId: string; beforeTabId: string | null }
	| { type: "drop-on-tab"; tabId: string; targetTabId: string }
	| { type: "drop-on-folder"; tabId: string; folderId: string };

function createId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTabPositions(tabs: WorkspaceTab[]): WorkspaceTab[] {
	return tabs.map((tab, index) => ({ ...tab, position: index }));
}

function normalizeFolderPositions(folders: WorkspaceFolder[]): WorkspaceFolder[] {
	return folders.map((folder, index) => ({ ...folder, position: index }));
}

export function reorderTopLevelTabs(
	session: WorkspaceSession,
	tabId: string,
	beforeTabId: string | null,
): WorkspaceSession {
	const draggedTab = session.tabs.find((tab) => tab.id === tabId);
	if (!draggedTab) return session;

	const rootTabs = session.tabs.filter(
		(tab) => tab.parentFolderId == null && tab.id !== tabId,
	);
	const childTabs = session.tabs.filter(
		(tab) => tab.parentFolderId != null && tab.id !== tabId,
	);

	const topLevelTab: WorkspaceTab = {
		...draggedTab,
		parentFolderId: null,
	};

	const insertIndex =
		beforeTabId == null
			? rootTabs.length
			: rootTabs.findIndex((tab) => tab.id === beforeTabId);
	if (insertIndex >= 0) {
		rootTabs.splice(insertIndex, 0, topLevelTab);
	} else {
		rootTabs.push(topLevelTab);
	}

	return {
		...session,
		tabs: normalizeTabPositions([...rootTabs, ...childTabs]),
	};
}

export function createFolderFromTabDrop(
	session: WorkspaceSession,
	tabId: string,
	targetTabId: string,
): WorkspaceSession {
	if (tabId === targetTabId) return session;

	const draggedTab = session.tabs.find((tab) => tab.id === tabId);
	const targetTab = session.tabs.find((tab) => tab.id === targetTabId);
	if (!draggedTab || !targetTab) return session;

	const targetFolderId = targetTab.parentFolderId;
	if (
		targetFolderId != null &&
		session.folders.some((folder) => folder.id === targetFolderId)
	) {
		if (draggedTab.parentFolderId === targetFolderId) return session;
		return {
			...session,
			tabs: session.tabs.map((tab) =>
				tab.id === tabId ? { ...tab, parentFolderId: targetFolderId } : tab,
			),
		};
	}

	const folderId = createId();
	const folderName = targetTab.title.trim() || "New folder";

	const folder: WorkspaceFolder = {
		id: folderId,
		name: folderName,
		icon: "folder",
		color: "slate",
		position: session.folders.length,
		collapsed: false,
	};

	return {
		...session,
		folders: normalizeFolderPositions([...session.folders, folder]),
		tabs: session.tabs.map((tab) =>
			tab.id === tabId || tab.id === targetTabId
				? { ...tab, parentFolderId: folderId }
				: tab,
		),
	};
}

export function addTabToFolderFromDrop(
	session: WorkspaceSession,
	tabId: string,
	folderId: string,
): WorkspaceSession {
	if (!session.tabs.some((tab) => tab.id === tabId)) return session;
	if (!session.folders.some((folder) => folder.id === folderId)) return session;

	return {
		...session,
		tabs: session.tabs.map((tab) =>
			tab.id === tabId ? { ...tab, parentFolderId: folderId } : tab,
		),
	};
}

export function applyWorkspaceDndIntentToSession(
	session: WorkspaceSession,
	intent: WorkspaceDndIntent,
): WorkspaceSession {
	switch (intent.type) {
		case "reorder-top-level":
			return reorderTopLevelTabs(session, intent.tabId, intent.beforeTabId);
		case "drop-on-tab":
			return createFolderFromTabDrop(session, intent.tabId, intent.targetTabId);
		case "drop-on-folder":
			return addTabToFolderFromDrop(session, intent.tabId, intent.folderId);
	}
}

interface UseWorkspaceDndOptions {
	onIntent: (intent: WorkspaceDndIntent) => void;
}

interface WorkspaceDndHandlers {
	onDragStart: DragEventHandler<HTMLElement>;
	onDragEnd: DragEventHandler<HTMLElement>;
	draggable: true;
}

interface WorkspaceDropHandlers {
	onDragOver: DragEventHandler<HTMLElement>;
	onDrop: DragEventHandler<HTMLElement>;
}

const preventDefaultDragOver: DragEventHandler<HTMLElement> = (event) => {
	event.preventDefault();
};

export function useWorkspaceDnd({ onIntent }: UseWorkspaceDndOptions) {
	const [draggingTabId, setDraggingTabId] = useState<string | null>(null);

	const getTabDragHandlers = useCallback(
		(tabId: string): WorkspaceDndHandlers => ({
			draggable: true,
			onDragStart: () => {
				setDraggingTabId(tabId);
			},
			onDragEnd: () => {
				setDraggingTabId(null);
			},
		}),
		[],
	);

	const createDropHandlers = useCallback(
		(
			buildIntent: (draggedTabId: string) => WorkspaceDndIntent | null,
		): WorkspaceDropHandlers => ({
			onDragOver: preventDefaultDragOver,
			onDrop: (event) => {
				event.preventDefault();
				if (!draggingTabId) return;
				const intent = buildIntent(draggingTabId);
				if (intent) {
					onIntent(intent);
				}
				setDraggingTabId(null);
			},
		}),
		[draggingTabId, onIntent],
	);

	const getReorderDropHandlers = useCallback(
		(beforeTabId: string | null): WorkspaceDropHandlers =>
			createDropHandlers((tabId) => ({
				type: "reorder-top-level",
				tabId,
				beforeTabId,
			})),
		[createDropHandlers],
	);

	const getTabDropHandlers = useCallback(
		(targetTabId: string): WorkspaceDropHandlers =>
			createDropHandlers((tabId) =>
				tabId === targetTabId
					? null
					: {
							type: "drop-on-tab",
							tabId,
							targetTabId,
						},
			),
		[createDropHandlers],
	);

	const getFolderDropHandlers = useCallback(
		(folderId: string): WorkspaceDropHandlers =>
			createDropHandlers((tabId) => ({
				type: "drop-on-folder",
				tabId,
				folderId,
			})),
		[createDropHandlers],
	);

	return {
		draggingTabId,
		getTabDragHandlers,
		getReorderDropHandlers,
		getTabDropHandlers,
		getFolderDropHandlers,
	};
}
