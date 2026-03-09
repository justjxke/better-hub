import { describe, expect, it } from "bun:test";
import {
	applyWorkspaceDndIntentToSession,
	createFolderFromTabDrop,
	reorderTopLevelTabs,
} from "../components/workspace/use-workspace-dnd";
import type { WorkspaceSession, WorkspaceTab } from "../components/workspace/workspace-types";

function makeTab(overrides: Partial<WorkspaceTab> & Pick<WorkspaceTab, "id">): WorkspaceTab {
	return {
		id: overrides.id,
		title: overrides.title ?? overrides.id,
		href: overrides.href ?? `/${overrides.id}`,
		kind: overrides.kind ?? "repo",
		parentFolderId:
			typeof overrides.parentFolderId === "undefined"
				? null
				: overrides.parentFolderId,
		layout: overrides.layout ?? { leftSidebarOpen: false, rightSidebarOpen: false },
		position: overrides.position ?? 0,
		icon: overrides.icon,
		context: overrides.context,
	};
}

function makeSession(tabs: WorkspaceTab[]): WorkspaceSession {
	return {
		stripOpen: true,
		activeTabId: tabs[0]?.id ?? null,
		mru: tabs.map((tab) => tab.id),
		folders: [
			{
				id: "folder-1",
				name: "Folder",
				icon: "folder",
				color: "slate",
				position: 0,
				collapsed: false,
			},
		],
		tabs,
	};
}

describe("workspace dnd helpers", () => {
	it("reorders top-level items and normalizes positions", () => {
		const session = makeSession([
			makeTab({ id: "tab-a", position: 0 }),
			makeTab({ id: "tab-b", position: 1 }),
			makeTab({ id: "tab-c", position: 2, parentFolderId: "folder-1" }),
		]);

		const next = reorderTopLevelTabs(session, "tab-b", "tab-a");

		expect(next.tabs.map((tab) => tab.id)).toEqual(["tab-b", "tab-a", "tab-c"]);
		expect(next.tabs.map((tab) => tab.position)).toEqual([0, 1, 2]);
		expect(next.tabs.find((tab) => tab.id === "tab-b")?.parentFolderId).toBeNull();
	});

	it("creates a folder when dropping one top-level tab onto another", () => {
		const session: WorkspaceSession = {
			stripOpen: true,
			activeTabId: "tab-a",
			mru: ["tab-a", "tab-b"],
			folders: [],
			tabs: [
				makeTab({ id: "tab-a", position: 0 }),
				makeTab({ id: "tab-b", position: 1 }),
			],
		};

		const next = createFolderFromTabDrop(session, "tab-a", "tab-b");

		expect(next.folders).toHaveLength(1);
		expect(next.folders.map((folder) => folder.position)).toEqual([0]);
		const folderId = next.folders[0]?.id;
		expect(folderId).toBeString();
		expect(next.tabs.find((tab) => tab.id === "tab-a")?.parentFolderId).toBe(folderId);
		expect(next.tabs.find((tab) => tab.id === "tab-b")?.parentFolderId).toBe(folderId);
	});

	it("moves a dropped tab into the existing folder when target tab is already in a folder", () => {
		const session = makeSession([
			makeTab({ id: "tab-a", position: 0 }),
			makeTab({ id: "tab-b", position: 1, parentFolderId: "folder-1" }),
		]);

		const next = createFolderFromTabDrop(session, "tab-a", "tab-b");

		expect(next.folders).toHaveLength(1);
		expect(next.folders[0]?.id).toBe("folder-1");
		expect(next.tabs.find((tab) => tab.id === "tab-a")?.parentFolderId).toBe(
			"folder-1",
		);
		expect(next.tabs.find((tab) => tab.id === "tab-b")?.parentFolderId).toBe(
			"folder-1",
		);
	});

	it("no-ops when dropping onto a tab in the same folder", () => {
		const session = makeSession([
			makeTab({ id: "tab-a", position: 0, parentFolderId: "folder-1" }),
			makeTab({ id: "tab-b", position: 1, parentFolderId: "folder-1" }),
		]);

		const next = createFolderFromTabDrop(session, "tab-a", "tab-b");

		expect(next).toBe(session);
	});

	it("supports drop-on-folder intents", () => {
		const session = makeSession([
			makeTab({ id: "tab-a", position: 0 }),
			makeTab({ id: "tab-b", position: 1 }),
		]);

		const next = applyWorkspaceDndIntentToSession(session, {
			type: "drop-on-folder",
			tabId: "tab-a",
			folderId: "folder-1",
		});

		expect(next.tabs.find((tab) => tab.id === "tab-a")?.parentFolderId).toBe(
			"folder-1",
		);
		expect(next.tabs.find((tab) => tab.id === "tab-b")?.parentFolderId).toBeNull();
	});

	it("can remove a child tab back to top level with reorder-top-level", () => {
		const session = makeSession([
			makeTab({ id: "tab-a", position: 0 }),
			makeTab({ id: "tab-b", position: 1, parentFolderId: "folder-1" }),
			makeTab({ id: "tab-c", position: 2 }),
		]);

		const next = applyWorkspaceDndIntentToSession(session, {
			type: "reorder-top-level",
			tabId: "tab-b",
			beforeTabId: "tab-c",
		});

		expect(next.tabs.map((tab) => tab.id)).toEqual(["tab-a", "tab-b", "tab-c"]);
		expect(next.tabs.find((tab) => tab.id === "tab-b")?.parentFolderId).toBeNull();
		expect(next.tabs.map((tab) => tab.position)).toEqual([0, 1, 2]);
	});

	it("guards self drop as a no-op", () => {
		const session = makeSession([makeTab({ id: "tab-a", position: 0 })]);

		const next = createFolderFromTabDrop(session, "tab-a", "tab-a");

		expect(next).toBe(session);
	});
});
