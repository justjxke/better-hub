import { beforeEach, describe, expect, it, mock } from "bun:test";

const getSessionMock = mock();
const headersMock = mock(async () => new Headers());
const getWorkspaceSessionMock = mock();
const upsertWorkspaceSessionMock = mock();

mock.module("@/lib/auth", () => ({
	auth: {
		api: {
			getSession: getSessionMock,
		},
	},
}));

mock.module("next/headers", () => ({
	headers: headersMock,
}));

mock.module("@/lib/workspace-tabs-store", () => ({
	getWorkspaceSession: getWorkspaceSessionMock,
	upsertWorkspaceSession: upsertWorkspaceSessionMock,
}));

describe("/api/workspace-tabs", () => {
	beforeEach(() => {
		getSessionMock.mockReset();
		headersMock.mockReset();
		getWorkspaceSessionMock.mockReset();
		upsertWorkspaceSessionMock.mockReset();
		headersMock.mockResolvedValue(new Headers());
	});

	it("GET returns 200 for an authenticated user", async () => {
		const payload = {
			stripOpen: false,
			activeTabId: null,
			tabs: [],
			folders: [],
			mru: [],
		};

		getSessionMock.mockResolvedValueOnce({ user: { id: "user_123" } });
		getWorkspaceSessionMock.mockResolvedValueOnce(payload);

		const { GET } = await import("./route");
		const response = await GET();

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(payload);
		expect(getWorkspaceSessionMock).toHaveBeenCalledWith("user_123");
	});

	it("GET unauthorized returns 401", async () => {
		getSessionMock.mockResolvedValueOnce(null);

		const { GET } = await import("./route");
		const response = await GET();

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
		expect(getWorkspaceSessionMock).not.toHaveBeenCalled();
	});

	it("PATCH unauthorized returns 401", async () => {
		getSessionMock.mockResolvedValueOnce(null);

		const { PATCH } = await import("./route");
		const response = await PATCH(
			new Request("http://localhost/api/workspace-tabs", {
				method: "PATCH",
				body: JSON.stringify({ stripOpen: true }),
			}),
		);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
		expect(upsertWorkspaceSessionMock).not.toHaveBeenCalled();
	});

	it("PATCH invalid payload returns 400", async () => {
		getSessionMock.mockResolvedValueOnce({ user: { id: "user_123" } });

		const invalidPayload = {
			stripOpen: true,
			activeTabId: "tab-2",
			tabs: [
				{
					id: "tab-1",
					title: "Tab 1",
					href: "/",
					kind: "repo",
					layout: {
						leftSidebarOpen: true,
						rightSidebarOpen: false,
					},
					position: 0,
				},
			],
			folders: [],
			mru: ["tab-3"],
		};

		const { PATCH } = await import("./route");
		const response = await PATCH(
			new Request("http://localhost/api/workspace-tabs", {
				method: "PATCH",
				body: JSON.stringify(invalidPayload),
			}),
		);

		expect(response.status).toBe(400);
		expect(upsertWorkspaceSessionMock).not.toHaveBeenCalled();
	});

	it("PATCH invalid JSON returns 400", async () => {
		getSessionMock.mockResolvedValueOnce({ user: { id: "user_123" } });

		const { PATCH } = await import("./route");
		const response = await PATCH(
			new Request("http://localhost/api/workspace-tabs", {
				method: "PATCH",
				body: "{ invalid",
			}),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "Invalid JSON body" });
		expect(upsertWorkspaceSessionMock).not.toHaveBeenCalled();
	});

	it("PATCH valid payload returns 200 and persists parsed payload", async () => {
		getSessionMock.mockResolvedValueOnce({ user: { id: "user_123" } });

		const patchPayload = {
			stripOpen: true,
			activeTabId: "tab-1",
			tabs: [
				{
					id: "tab-1",
					title: "Tab 1",
					href: "/chat",
					kind: "repo",
					icon: null,
					context: null,
					parentFolderId: null,
					layout: {
						leftSidebarOpen: true,
						leftSidebarWidth: 280,
						rightSidebarOpen: false,
						rightSidebarWidth: 320,
					},
					position: 0,
				},
			],
			folders: [
				{
					id: "folder-1",
					name: "Folder 1",
					icon: "folder",
					color: "blue",
					position: 0,
					collapsed: false,
				},
			],
			mru: ["tab-1"],
		};

		const { PATCH } = await import("./route");
		const response = await PATCH(
			new Request("http://localhost/api/workspace-tabs", {
				method: "PATCH",
				body: JSON.stringify(patchPayload),
			}),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(upsertWorkspaceSessionMock).toHaveBeenCalledWith("user_123", patchPayload);
	});
});
