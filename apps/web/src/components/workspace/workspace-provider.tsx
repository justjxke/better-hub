"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
	canonicalizeWorkspaceTabHref,
	classifyWorkspaceRoute,
	getWorkspaceTabTitle,
	isSameWorkspaceTarget,
} from "@/lib/workspace-route";
import { applyWorkspaceDndIntentToSession, type WorkspaceDndIntent } from "./use-workspace-dnd";
import {
	DEFAULT_WORKSPACE_LAYOUT,
	type WorkspaceFolder,
	type WorkspaceLayoutState,
	type WorkspaceSession,
	type WorkspaceTab,
} from "./workspace-types";

interface WorkspaceProviderProps {
	children: ReactNode;
	initialSession: WorkspaceSession;
}

type WorkspaceFolderMetaPatch = Partial<
	Pick<WorkspaceFolder, "name" | "icon" | "color" | "collapsed">
>;

interface WorkspaceTabsContextValue {
	stripOpen: boolean;
	tabs: WorkspaceTab[];
	folders: WorkspaceFolder[];
	activeTabId: string | null;
	mru: string[];
	toggleStrip: () => void;
	reconcileIncomingHrefOnFirstLoad: (href: string) => void;
	seedCurrentPageIfEmpty: (pathname: string) => void;
	activateTab: (id: string) => void;
	replaceCurrentTabWithHref: (href: string) => void;
	openHrefInNewTab: (href: string) => void;
	duplicateCurrentTab: () => void;
	duplicateTab: (id: string) => void;
	closeTab: (id: string) => void;
	closeOtherTabs: (id: string) => void;
	moveTabToFolder: (tabId: string, folderId: string | null) => void;
	createFolder: (seed?: Partial<Pick<WorkspaceFolder, "name" | "icon" | "color">>) => void;
	addTabToNewFolder: (tabId: string) => void;
	setFolderExpanded: (folderId: string, expanded: boolean) => void;
	updateFolderMeta: (folderId: string, patch: WorkspaceFolderMetaPatch) => void;
	deleteFolderKeepTabs: (folderId: string) => void;
	deleteFolderRemoveTabs: (folderId: string) => void;
	applyWorkspaceDndIntent: (intent: WorkspaceDndIntent) => void;
	updateTabLayout: (tabId: string, patch: Partial<WorkspaceLayoutState>) => void;
	updateActiveTabLayout: (patch: Partial<WorkspaceLayoutState>) => void;
}

const WorkspaceTabsContext = createContext<WorkspaceTabsContextValue | null>(null);

function createId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeHref(href: string): string {
	const trimmed = href.trim();
	if (!trimmed) return "/";
	return canonicalizeWorkspaceTabHref(trimmed);
}

function withNormalizedTabPositions(tabs: WorkspaceTab[]): WorkspaceTab[] {
	return tabs.map((tab, index) => ({ ...tab, position: index }));
}

function withNormalizedFolderPositions(folders: WorkspaceFolder[]): WorkspaceFolder[] {
	return folders.map((folder, index) => ({ ...folder, position: index }));
}

function touchMru(mru: string[], tabId: string): string[] {
	return [tabId, ...mru.filter((entry) => entry !== tabId)];
}

function createTabFromHref(href: string, position: number): WorkspaceTab {
	const normalizedHref = normalizeHref(href);
	return {
		id: createId(),
		title: getWorkspaceTabTitle(normalizedHref),
		href: normalizedHref,
		kind: classifyWorkspaceRoute(normalizedHref).kind,
		layout: { ...DEFAULT_WORKSPACE_LAYOUT },
		position,
	};
}

function createFolderRecord(
	position: number,
	seed?: Partial<Pick<WorkspaceFolder, "name" | "icon" | "color">>,
): WorkspaceFolder {
	const name = seed?.name?.trim();
	return {
		id: createId(),
		name: name && name.length > 0 ? name : "New folder",
		icon: seed?.icon ?? "folder",
		color: seed?.color ?? "slate",
		position,
		collapsed: false,
	};
}

function resolveNextActiveTabId(
	tabs: WorkspaceTab[],
	currentActiveTabId: string | null,
	mru: string[],
): string | null {
	if (!tabs.some((tab) => tab.id === currentActiveTabId)) {
		const mruCandidate = mru.find((id) => tabs.some((tab) => tab.id === id));
		if (mruCandidate) return mruCandidate;
	}
	if (currentActiveTabId && tabs.some((tab) => tab.id === currentActiveTabId)) {
		return currentActiveTabId;
	}
	return tabs[0]?.id ?? null;
}

function normalizeFolderMetaPatch(patch: WorkspaceFolderMetaPatch): WorkspaceFolderMetaPatch {
	if (patch.name === undefined) return patch;

	const trimmedName = patch.name.trim();
	if (!trimmedName) {
		const { name: _name, ...rest } = patch;
		return rest;
	}

	return {
		...patch,
		name: trimmedName,
	};
}

export function WorkspaceProvider({ children, initialSession }: WorkspaceProviderProps) {
	const [session, setSession] = useState<WorkspaceSession>(initialSession);
	const hasMountedRef = useRef(false);
	const hasReconciledIncomingHrefRef = useRef(false);
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const toggleStrip = useCallback(() => {
		setSession((prev) => ({ ...prev, stripOpen: !prev.stripOpen }));
	}, []);

	const reconcileIncomingHrefOnFirstLoad = useCallback((href: string) => {
		const normalizedHref = normalizeHref(href);
		setSession((prev) => {
			const matchingTab = prev.tabs.find((tab) =>
				isSameWorkspaceTarget(tab.href, normalizedHref),
			);
			if (matchingTab) {
				return {
					...prev,
					activeTabId: matchingTab.id,
					mru: touchMru(prev.mru, matchingTab.id),
				};
			}

			if (prev.tabs.length === 0) {
				const tab = createTabFromHref(normalizedHref, 0);
				return {
					...prev,
					tabs: [tab],
					activeTabId: tab.id,
					mru: [tab.id],
				};
			}

			const targetTabId = prev.activeTabId ?? prev.tabs[0]?.id;
			if (!targetTabId) return prev;

			const tabs = prev.tabs.map((tab) =>
				tab.id === targetTabId
					? {
							...tab,
							href: normalizedHref,
							title: getWorkspaceTabTitle(normalizedHref),
							kind: classifyWorkspaceRoute(normalizedHref)
								.kind,
						}
					: tab,
			);

			return {
				...prev,
				tabs,
				activeTabId: targetTabId,
				mru: touchMru(prev.mru, targetTabId),
			};
		});
	}, []);

	const seedCurrentPageIfEmpty = useCallback((pathname: string) => {
		setSession((prev) => {
			if (prev.tabs.length > 0) return prev;
			const tab = createTabFromHref(pathname, 0);
			return {
				...prev,
				tabs: [tab],
				activeTabId: tab.id,
				mru: [tab.id],
			};
		});
	}, []);

	const activateTab = useCallback((id: string) => {
		setSession((prev) => {
			if (!prev.tabs.some((tab) => tab.id === id)) return prev;
			return {
				...prev,
				activeTabId: id,
				mru: touchMru(prev.mru, id),
			};
		});
	}, []);

	const replaceCurrentTabWithHref = useCallback((href: string) => {
		setSession((prev) => {
			if (prev.tabs.length === 0) {
				const tab = createTabFromHref(href, 0);
				return {
					...prev,
					tabs: [tab],
					activeTabId: tab.id,
					mru: [tab.id],
				};
			}

			const targetTabId = prev.activeTabId ?? prev.tabs[0]?.id;
			if (!targetTabId) return prev;

			const normalizedHref = normalizeHref(href);
			const updatedTabs = prev.tabs.map((tab) =>
				tab.id === targetTabId
					? {
							...tab,
							href: normalizedHref,
							title: getWorkspaceTabTitle(normalizedHref),
							kind: classifyWorkspaceRoute(normalizedHref)
								.kind,
						}
					: tab,
			);

			return {
				...prev,
				tabs: updatedTabs,
				activeTabId: targetTabId,
				mru: touchMru(prev.mru, targetTabId),
			};
		});
	}, []);

	useEffect(() => {
		const currentPath = pathname || "/";
		const query = searchParams.toString();
		const currentHref = query ? `${currentPath}?${query}` : currentPath;

		if (!hasReconciledIncomingHrefRef.current) {
			hasReconciledIncomingHrefRef.current = true;
			reconcileIncomingHrefOnFirstLoad(currentHref);
			return;
		}

		replaceCurrentTabWithHref(currentHref);
	}, [pathname, reconcileIncomingHrefOnFirstLoad, replaceCurrentTabWithHref, searchParams]);

	const openHrefInNewTab = useCallback((href: string) => {
		setSession((prev) => {
			const tab = createTabFromHref(href, prev.tabs.length);
			const tabs = withNormalizedTabPositions([...prev.tabs, tab]);
			return {
				...prev,
				tabs,
				activeTabId: tab.id,
				mru: touchMru(prev.mru, tab.id),
			};
		});
	}, []);

	const duplicateTab = useCallback((id: string) => {
		setSession((prev) => {
			const currentIndex = prev.tabs.findIndex((tab) => tab.id === id);
			if (currentIndex === -1) return prev;

			const currentTab = prev.tabs[currentIndex];
			const duplicatedTab: WorkspaceTab = {
				...currentTab,
				id: createId(),
			};
			const tabs = [...prev.tabs];
			tabs.splice(currentIndex + 1, 0, duplicatedTab);
			const normalizedTabs = withNormalizedTabPositions(tabs);

			return {
				...prev,
				tabs: normalizedTabs,
				activeTabId: duplicatedTab.id,
				mru: touchMru(prev.mru, duplicatedTab.id),
			};
		});
	}, []);

	const duplicateCurrentTab = useCallback(() => {
		setSession((prev) => {
			const activeTabId = prev.activeTabId ?? prev.tabs[0]?.id;
			if (!activeTabId) return prev;

			const currentIndex = prev.tabs.findIndex((tab) => tab.id === activeTabId);
			if (currentIndex === -1) return prev;

			const currentTab = prev.tabs[currentIndex];
			const duplicatedTab: WorkspaceTab = {
				...currentTab,
				id: createId(),
			};
			const tabs = [...prev.tabs];
			tabs.splice(currentIndex + 1, 0, duplicatedTab);
			const normalizedTabs = withNormalizedTabPositions(tabs);

			return {
				...prev,
				tabs: normalizedTabs,
				activeTabId: duplicatedTab.id,
				mru: touchMru(prev.mru, duplicatedTab.id),
			};
		});
	}, []);

	const closeTab = useCallback((id: string) => {
		setSession((prev) => {
			if (!prev.tabs.some((tab) => tab.id === id)) return prev;

			const tabs = withNormalizedTabPositions(
				prev.tabs.filter((tab) => tab.id !== id),
			);
			const mru = prev.mru.filter((entry) => entry !== id);
			const activeTabId = resolveNextActiveTabId(
				tabs,
				prev.activeTabId === id ? null : prev.activeTabId,
				mru,
			);

			return {
				...prev,
				tabs,
				activeTabId,
				mru: activeTabId ? touchMru(mru, activeTabId) : mru,
			};
		});
	}, []);

	const closeOtherTabs = useCallback((id: string) => {
		setSession((prev) => {
			const target = prev.tabs.find((tab) => tab.id === id);
			if (!target) return prev;
			return {
				...prev,
				tabs: [{ ...target, position: 0 }],
				activeTabId: id,
				mru: [id],
			};
		});
	}, []);

	const moveTabToFolder = useCallback((tabId: string, folderId: string | null) => {
		setSession((prev) => {
			if (!prev.tabs.some((tab) => tab.id === tabId)) return prev;
			if (folderId && !prev.folders.some((folder) => folder.id === folderId)) {
				return prev;
			}

			return {
				...prev,
				tabs: prev.tabs.map((tab) =>
					tab.id === tabId
						? { ...tab, parentFolderId: folderId }
						: tab,
				),
			};
		});
	}, []);

	const createFolder = useCallback(
		(seed?: Partial<Pick<WorkspaceFolder, "name" | "icon" | "color">>) => {
			setSession((prev) => {
				const folder = createFolderRecord(prev.folders.length, seed);
				return {
					...prev,
					folders: withNormalizedFolderPositions([
						...prev.folders,
						folder,
					]),
				};
			});
		},
		[],
	);

	const addTabToNewFolder = useCallback((tabId: string) => {
		setSession((prev) => {
			const tab = prev.tabs.find((entry) => entry.id === tabId);
			if (!tab) return prev;

			const folder = createFolderRecord(prev.folders.length, {
				name: tab.title,
			});

			return {
				...prev,
				folders: withNormalizedFolderPositions([...prev.folders, folder]),
				tabs: prev.tabs.map((entry) =>
					entry.id === tabId
						? { ...entry, parentFolderId: folder.id }
						: entry,
				),
			};
		});
	}, []);

	const setFolderExpanded = useCallback((folderId: string, expanded: boolean) => {
		setSession((prev) => ({
			...prev,
			folders: prev.folders.map((folder) =>
				folder.id === folderId
					? { ...folder, collapsed: !expanded }
					: folder,
			),
		}));
	}, []);

	const updateFolderMeta = useCallback(
		(folderId: string, patch: WorkspaceFolderMetaPatch) => {
			const normalizedPatch = normalizeFolderMetaPatch(patch);
			if (Object.keys(normalizedPatch).length === 0) return;

			setSession((prev) => ({
				...prev,
				folders: prev.folders.map((folder) =>
					folder.id === folderId
						? { ...folder, ...normalizedPatch }
						: folder,
				),
			}));
		},
		[],
	);

	const deleteFolderKeepTabs = useCallback((folderId: string) => {
		setSession((prev) => ({
			...prev,
			folders: withNormalizedFolderPositions(
				prev.folders.filter((folder) => folder.id !== folderId),
			),
			tabs: prev.tabs.map((tab) =>
				tab.parentFolderId === folderId
					? { ...tab, parentFolderId: null }
					: tab,
			),
		}));
	}, []);

	const deleteFolderRemoveTabs = useCallback((folderId: string) => {
		setSession((prev) => {
			const tabs = withNormalizedTabPositions(
				prev.tabs.filter((tab) => tab.parentFolderId !== folderId),
			);
			const mru = prev.mru.filter((id) => tabs.some((tab) => tab.id === id));
			const activeTabId = resolveNextActiveTabId(tabs, prev.activeTabId, mru);

			return {
				...prev,
				folders: withNormalizedFolderPositions(
					prev.folders.filter((folder) => folder.id !== folderId),
				),
				tabs,
				activeTabId,
				mru: activeTabId ? touchMru(mru, activeTabId) : mru,
			};
		});
	}, []);

	const applyWorkspaceDndIntent = useCallback((intent: WorkspaceDndIntent) => {
		setSession((prev) => applyWorkspaceDndIntentToSession(prev, intent));
	}, []);

	const updateTabLayout = useCallback(
		(tabId: string, patch: Partial<WorkspaceLayoutState>) => {
			if (Object.keys(patch).length === 0) return;
			setSession((prev) => {
				const target = prev.tabs.find((tab) => tab.id === tabId);
				if (!target) return prev;

				const nextLayout = { ...target.layout, ...patch };
				if (
					nextLayout.leftSidebarOpen ===
						target.layout.leftSidebarOpen &&
					nextLayout.leftSidebarWidth ===
						target.layout.leftSidebarWidth &&
					nextLayout.rightSidebarOpen ===
						target.layout.rightSidebarOpen &&
					nextLayout.rightSidebarWidth ===
						target.layout.rightSidebarWidth
				) {
					return prev;
				}

				return {
					...prev,
					tabs: prev.tabs.map((tab) =>
						tab.id === tabId
							? { ...tab, layout: nextLayout }
							: tab,
					),
				};
			});
		},
		[],
	);

	const updateActiveTabLayout = useCallback((patch: Partial<WorkspaceLayoutState>) => {
		if (Object.keys(patch).length === 0) return;
		setSession((prev) => {
			const activeTabId = prev.activeTabId ?? prev.tabs[0]?.id;
			if (!activeTabId) return prev;

			const target = prev.tabs.find((tab) => tab.id === activeTabId);
			if (!target) return prev;

			const nextLayout = { ...target.layout, ...patch };
			if (
				nextLayout.leftSidebarOpen === target.layout.leftSidebarOpen &&
				nextLayout.leftSidebarWidth === target.layout.leftSidebarWidth &&
				nextLayout.rightSidebarOpen === target.layout.rightSidebarOpen &&
				nextLayout.rightSidebarWidth === target.layout.rightSidebarWidth
			) {
				return prev;
			}

			return {
				...prev,
				tabs: prev.tabs.map((tab) =>
					tab.id === activeTabId
						? { ...tab, layout: nextLayout }
						: tab,
				),
			};
		});
	}, []);

	useEffect(() => {
		if (!hasMountedRef.current) {
			hasMountedRef.current = true;
			return;
		}

		const controller = new AbortController();
		const timeout = setTimeout(() => {
			fetch("/api/workspace-tabs", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(session),
				signal: controller.signal,
			}).catch(() => {});
		}, 400);

		return () => {
			controller.abort();
			clearTimeout(timeout);
		};
	}, [session]);

	return (
		<WorkspaceTabsContext.Provider
			value={{
				stripOpen: session.stripOpen,
				tabs: session.tabs,
				folders: session.folders,
				activeTabId: session.activeTabId,
				mru: session.mru,
				toggleStrip,
				reconcileIncomingHrefOnFirstLoad,
				seedCurrentPageIfEmpty,
				activateTab,
				replaceCurrentTabWithHref,
				openHrefInNewTab,
				duplicateCurrentTab,
				duplicateTab,
				closeTab,
				closeOtherTabs,
				moveTabToFolder,
				createFolder,
				addTabToNewFolder,
				setFolderExpanded,
				updateFolderMeta,
				deleteFolderKeepTabs,
				deleteFolderRemoveTabs,
				applyWorkspaceDndIntent,
				updateTabLayout,
				updateActiveTabLayout,
			}}
		>
			{children}
		</WorkspaceTabsContext.Provider>
	);
}

export function useWorkspaceTabs() {
	const context = useContext(WorkspaceTabsContext);
	if (!context) {
		throw new Error("useWorkspaceTabs must be used within WorkspaceProvider");
	}
	return context;
}
