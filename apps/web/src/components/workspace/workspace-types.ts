export const WORKSPACE_TAB_KINDS = [
	"repo",
	"pull",
	"issue",
	"discussion",
	"actions",
	"search",
	"file",
	"dashboard",
] as const;

export type WorkspaceTabKind = (typeof WORKSPACE_TAB_KINDS)[number];

export interface WorkspaceLayoutState {
	leftSidebarOpen: boolean;
	leftSidebarWidth?: number;
	rightSidebarOpen: boolean;
	rightSidebarWidth?: number;
}

export interface WorkspaceTab {
	id: string;
	title: string;
	href: string;
	kind: WorkspaceTabKind;
	icon?: string | null;
	context?: Record<string, unknown> | null;
	parentFolderId?: string | null;
	layout: WorkspaceLayoutState;
	position: number;
}

export interface WorkspaceFolder {
	id: string;
	name: string;
	icon: string;
	color: string;
	position: number;
	collapsed: boolean;
}

export interface WorkspaceSession {
	stripOpen: boolean;
	activeTabId: string | null;
	tabs: WorkspaceTab[];
	folders: WorkspaceFolder[];
	mru: string[];
}

export const DEFAULT_WORKSPACE_LAYOUT: WorkspaceLayoutState = {
	leftSidebarOpen: false,
	rightSidebarOpen: false,
};

export const EMPTY_WORKSPACE_SESSION: WorkspaceSession = {
	stripOpen: false,
	activeTabId: null,
	tabs: [],
	folders: [],
	mru: [],
};
