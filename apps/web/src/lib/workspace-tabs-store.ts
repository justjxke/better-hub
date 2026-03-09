import { prisma } from "./db";

export interface WorkspaceLayoutState {
	leftSidebarOpen: boolean;
	leftSidebarWidth?: number;
	rightSidebarOpen: boolean;
	rightSidebarWidth?: number;
}

export interface WorkspaceTabRecord {
	id: string;
	title: string;
	href: string;
	kind:
		| "repo"
		| "pull"
		| "issue"
		| "discussion"
		| "actions"
		| "search"
		| "file"
		| "dashboard";
	icon?: string | null;
	context?: Record<string, unknown> | null;
	parentFolderId?: string | null;
	layout: WorkspaceLayoutState;
	position: number;
}

export interface WorkspaceFolderRecord {
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
	tabs: WorkspaceTabRecord[];
	folders: WorkspaceFolderRecord[];
	mru: string[];
}

const EMPTY_SESSION: WorkspaceSession = {
	stripOpen: false,
	activeTabId: null,
	tabs: [],
	folders: [],
	mru: [],
};

const WORKSPACE_TAB_KINDS = [
	"repo",
	"pull",
	"issue",
	"discussion",
	"actions",
	"search",
	"file",
	"dashboard",
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		Object.getPrototypeOf(value) === Object.prototype
	);
}

function isWorkspaceTabKind(value: unknown): value is WorkspaceTabRecord["kind"] {
	return typeof value === "string" && WORKSPACE_TAB_KINDS.some((kind) => kind === value);
}

function parseTabKind(value: unknown): WorkspaceTabRecord["kind"] {
	if (!isWorkspaceTabKind(value)) return "repo";
	return value;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
	if (!value) return fallback;
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
}

function parseLayoutJson(value: string | null | undefined): WorkspaceLayoutState {
	const parsed = parseJson<unknown>(value, {});
	const layout = isPlainObject(parsed) ? parsed : {};
	return {
		leftSidebarOpen:
			typeof layout.leftSidebarOpen === "boolean"
				? layout.leftSidebarOpen
				: false,
		leftSidebarWidth:
			typeof layout.leftSidebarWidth === "number" &&
			Number.isFinite(layout.leftSidebarWidth)
				? layout.leftSidebarWidth
				: undefined,
		rightSidebarOpen:
			typeof layout.rightSidebarOpen === "boolean"
				? layout.rightSidebarOpen
				: false,
		rightSidebarWidth:
			typeof layout.rightSidebarWidth === "number" &&
			Number.isFinite(layout.rightSidebarWidth)
				? layout.rightSidebarWidth
				: undefined,
	};
}

function parseMruJson(value: string | null | undefined): string[] {
	const parsed = parseJson<unknown>(value, []);
	if (!Array.isArray(parsed)) return [];
	return parsed.filter((entry): entry is string => typeof entry === "string");
}

function parseContextJson(value: string | null | undefined): Record<string, unknown> | null {
	const parsed = parseJson<unknown>(value, null);
	if (!isPlainObject(parsed)) return null;
	return parsed;
}

function toJson(value: unknown): string {
	return JSON.stringify(value);
}

export async function seedWorkspaceState(userId: string) {
	const now = new Date().toISOString();
	return prisma.workspaceState.upsert({
		where: { userId },
		create: {
			userId,
			stripOpen: false,
			activeTabId: null,
			mruJson: "[]",
			createdAt: now,
			updatedAt: now,
		},
		update: {},
	});
}

export async function getWorkspaceSession(userId: string): Promise<WorkspaceSession> {
	let state = await prisma.workspaceState.findUnique({ where: { userId } });
	if (!state) {
		state = await seedWorkspaceState(userId);
	}

	const [tabs, folders] = await Promise.all([
		prisma.workspaceTab.findMany({
			where: { userId },
			orderBy: { position: "asc" },
		}),
		prisma.workspaceFolder.findMany({
			where: { userId },
			orderBy: { position: "asc" },
		}),
	]);

	if (!state) return EMPTY_SESSION;

	return {
		stripOpen: state.stripOpen ?? false,
		activeTabId: state.activeTabId ?? null,
		tabs: tabs.map((row) => ({
			id: row.tabId,
			title: row.title,
			href: row.href,
			kind: parseTabKind(row.kind),
			icon: row.icon ?? null,
			context: parseContextJson(row.contextJson),
			parentFolderId: row.parentFolderId ?? null,
			layout: parseLayoutJson(row.layoutJson),
			position: row.position,
		})),
		folders: folders.map((row) => ({
			id: row.folderId,
			name: row.name,
			icon: row.icon,
			color: row.color,
			position: row.position,
			collapsed: row.collapsed,
		})),
		mru: parseMruJson(state.mruJson),
	};
}

export async function upsertWorkspaceSession(
	userId: string,
	payload: WorkspaceSession,
): Promise<void> {
	const now = new Date().toISOString();
	await prisma.$transaction(async (tx) => {
		await tx.workspaceState.upsert({
			where: { userId },
			create: {
				userId,
				stripOpen: payload.stripOpen,
				activeTabId: payload.activeTabId,
				mruJson: toJson(payload.mru),
				createdAt: now,
				updatedAt: now,
			},
			update: {
				stripOpen: payload.stripOpen,
				activeTabId: payload.activeTabId,
				mruJson: toJson(payload.mru),
				updatedAt: now,
			},
		});

		await tx.workspaceFolder.deleteMany({ where: { userId } });
		if (payload.folders.length > 0) {
			await tx.workspaceFolder.createMany({
				data: payload.folders.map((folder) => ({
					userId,
					folderId: folder.id,
					name: folder.name,
					icon: folder.icon,
					color: folder.color,
					position: folder.position,
					collapsed: folder.collapsed,
					createdAt: now,
					updatedAt: now,
				})),
			});
		}

		await tx.workspaceTab.deleteMany({ where: { userId } });
		if (payload.tabs.length > 0) {
			await tx.workspaceTab.createMany({
				data: payload.tabs.map((tab) => ({
					userId,
					tabId: tab.id,
					parentFolderId: tab.parentFolderId ?? null,
					title: tab.title,
					href: tab.href,
					kind: tab.kind,
					icon: tab.icon ?? null,
					contextJson: tab.context ? toJson(tab.context) : null,
					layoutJson: toJson(tab.layout),
					position: tab.position,
					lastActiveAt: now,
					createdAt: now,
					updatedAt: now,
				})),
			});
		}
	});
}
