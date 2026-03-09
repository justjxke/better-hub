import { beforeEach, describe, expect, it, mock } from "bun:test";

const workspaceStateFindUniqueMock = mock();
const workspaceStateCreateMock = mock();
const workspaceStateUpsertMock = mock();
const workspaceFolderFindManyMock = mock();
const workspaceFolderDeleteManyMock = mock();
const workspaceFolderCreateManyMock = mock();
const workspaceTabFindManyMock = mock();
const workspaceTabDeleteManyMock = mock();
const workspaceTabCreateManyMock = mock();
const transactionMock = mock(async (fn: (tx: unknown) => unknown) => fn(prismaMock));

const prismaMock = {
	workspaceState: {
		findUnique: workspaceStateFindUniqueMock,
		create: workspaceStateCreateMock,
		upsert: workspaceStateUpsertMock,
	},
	workspaceFolder: {
		findMany: workspaceFolderFindManyMock,
		deleteMany: workspaceFolderDeleteManyMock,
		createMany: workspaceFolderCreateManyMock,
	},
	workspaceTab: {
		findMany: workspaceTabFindManyMock,
		deleteMany: workspaceTabDeleteManyMock,
		createMany: workspaceTabCreateManyMock,
	},
	$transaction: transactionMock,
};

mock.module("./db", () => ({ prisma: prismaMock }));

function mockPersistedState(
	overrides: Partial<{
		stripOpen: boolean;
		activeTabId: string | null;
		mruJson: string;
	}> = {},
) {
	workspaceStateFindUniqueMock.mockResolvedValueOnce({
		userId: "u_123",
		stripOpen: false,
		activeTabId: null,
		mruJson: "[]",
		...overrides,
	});
}

function mockSingleTab(overrides: Partial<Record<string, unknown>> = {}) {
	workspaceTabFindManyMock.mockResolvedValueOnce([
		{
			tabId: "tab-1",
			title: "Tab 1",
			href: "/repo",
			kind: "repo",
			icon: null,
			contextJson: null,
			parentFolderId: null,
			layoutJson: "{}",
			position: 0,
			...overrides,
		},
	]);
}

describe("workspace-tabs-store", () => {
	beforeEach(() => {
		workspaceStateFindUniqueMock.mockReset();
		workspaceStateCreateMock.mockReset();
		workspaceStateUpsertMock.mockReset();
		workspaceFolderFindManyMock.mockReset();
		workspaceFolderDeleteManyMock.mockReset();
		workspaceFolderCreateManyMock.mockReset();
		workspaceTabFindManyMock.mockReset();
		workspaceTabDeleteManyMock.mockReset();
		workspaceTabCreateManyMock.mockReset();
		transactionMock.mockClear();
	});

	it("seeds missing workspace state with upsert", async () => {
		workspaceStateFindUniqueMock.mockResolvedValueOnce(null);
		workspaceStateUpsertMock.mockResolvedValueOnce({
			userId: "u_123",
			stripOpen: false,
			activeTabId: null,
			mruJson: "[]",
		});
		workspaceFolderFindManyMock.mockResolvedValueOnce([]);
		workspaceTabFindManyMock.mockResolvedValueOnce([]);

		const { getWorkspaceSession } = await import("./workspace-tabs-store");
		const session = await getWorkspaceSession("u_123");

		expect(session).toEqual({
			stripOpen: false,
			activeTabId: null,
			tabs: [],
			folders: [],
			mru: [],
		});
		expect(workspaceStateUpsertMock).toHaveBeenCalledTimes(1);
		expect(workspaceStateCreateMock).not.toHaveBeenCalled();
	});

	it("safely normalizes layoutJson when null or malformed", async () => {
		mockPersistedState();
		workspaceTabFindManyMock.mockResolvedValueOnce([
			{
				tabId: "tab-null",
				title: "Null layout",
				href: "/null",
				kind: "repo",
				icon: null,
				contextJson: null,
				parentFolderId: null,
				layoutJson: "null",
				position: 0,
			},
			{
				tabId: "tab-malformed",
				title: "Malformed layout",
				href: "/malformed",
				kind: "repo",
				icon: null,
				contextJson: null,
				parentFolderId: null,
				layoutJson: "{",
				position: 1,
			},
		]);
		workspaceFolderFindManyMock.mockResolvedValueOnce([]);

		const { getWorkspaceSession } = await import("./workspace-tabs-store");
		const session = await getWorkspaceSession("u_123");

		expect(session.tabs.map((tab) => tab.layout)).toEqual([
			{
				leftSidebarOpen: false,
				leftSidebarWidth: undefined,
				rightSidebarOpen: false,
				rightSidebarWidth: undefined,
			},
			{
				leftSidebarOpen: false,
				leftSidebarWidth: undefined,
				rightSidebarOpen: false,
				rightSidebarWidth: undefined,
			},
		]);
	});

	it("falls back safely for invalid contextJson and mruJson", async () => {
		mockPersistedState({ mruJson: '{"bad":true}' });
		mockSingleTab({ contextJson: "[1,2,3]" });
		workspaceFolderFindManyMock.mockResolvedValueOnce([]);

		const { getWorkspaceSession } = await import("./workspace-tabs-store");
		const session = await getWorkspaceSession("u_123");

		expect(session.tabs[0]?.context).toBeNull();
		expect(session.mru).toEqual([]);
	});

	it("normalizes invalid tab kind to repo", async () => {
		mockPersistedState();
		mockSingleTab({ kind: "totally-unknown" });
		workspaceFolderFindManyMock.mockResolvedValueOnce([]);

		const { getWorkspaceSession } = await import("./workspace-tabs-store");
		const session = await getWorkspaceSession("u_123");

		expect(session.tabs[0]?.kind).toBe("repo");
	});

	it("serializes tab context to contextJson during upsert", async () => {
		workspaceStateUpsertMock.mockResolvedValueOnce(undefined);
		workspaceFolderDeleteManyMock.mockResolvedValueOnce({ count: 0 });
		workspaceTabDeleteManyMock.mockResolvedValueOnce({ count: 0 });
		workspaceTabCreateManyMock.mockResolvedValueOnce({ count: 2 });

		const { upsertWorkspaceSession } = await import("./workspace-tabs-store");
		await upsertWorkspaceSession("u_123", {
			stripOpen: true,
			activeTabId: "tab-1",
			tabs: [
				{
					id: "tab-1",
					title: "PR #42",
					href: "/pull/42",
					kind: "pull",
					context: { owner: "acme", repo: "better-hub", number: 42 },
					layout: {
						leftSidebarOpen: true,
						rightSidebarOpen: false,
					},
					position: 0,
				},
				{
					id: "tab-2",
					title: "Dashboard",
					href: "/",
					kind: "dashboard",
					layout: {
						leftSidebarOpen: false,
						rightSidebarOpen: false,
					},
					position: 1,
				},
			],
			folders: [],
			mru: [],
		});

		expect(workspaceTabCreateManyMock).toHaveBeenCalledTimes(1);
		const createManyArg = workspaceTabCreateManyMock.mock.calls[0]?.[0] as {
			data: Array<{ tabId: string; contextJson: string | null }>;
		};
		expect(
			createManyArg.data.map((entry) => ({
				tabId: entry.tabId,
				contextJson: entry.contextJson,
			})),
		).toEqual([
			{
				tabId: "tab-1",
				contextJson: JSON.stringify({
					owner: "acme",
					repo: "better-hub",
					number: 42,
				}),
			},
			{
				tabId: "tab-2",
				contextJson: null,
			},
		]);
	});
});
