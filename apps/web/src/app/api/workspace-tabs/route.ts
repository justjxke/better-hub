import { headers } from "next/headers";
import { z } from "zod";
import { WORKSPACE_TAB_KINDS } from "../../../components/workspace/workspace-types";
import { auth } from "@/lib/auth";
import { getWorkspaceSession, upsertWorkspaceSession } from "@/lib/workspace-tabs-store";

const workspaceLayoutSchema = z
	.object({
		leftSidebarOpen: z.boolean(),
		leftSidebarWidth: z.number().finite().optional(),
		rightSidebarOpen: z.boolean(),
		rightSidebarWidth: z.number().finite().optional(),
	})
	.strict();

const workspaceTabSchema = z
	.object({
		id: z.string().min(1),
		title: z.string().min(1),
		href: z.string().min(1),
		kind: z.enum(WORKSPACE_TAB_KINDS),
		icon: z.string().nullable().optional(),
		context: z.record(z.string(), z.unknown()).nullable().optional(),
		parentFolderId: z.string().nullable().optional(),
		layout: workspaceLayoutSchema,
		position: z.number().int().min(0),
	})
	.strict();

const workspaceFolderSchema = z
	.object({
		id: z.string().min(1),
		name: z.string().min(1),
		icon: z.string().min(1),
		color: z.string().min(1),
		position: z.number().int().min(0),
		collapsed: z.boolean(),
	})
	.strict();

const workspaceSessionSchema = z
	.object({
		stripOpen: z.boolean(),
		activeTabId: z.string().nullable(),
		tabs: z.array(workspaceTabSchema),
		folders: z.array(workspaceFolderSchema),
		mru: z.array(z.string()),
	})
	.strict()
	.superRefine((session, ctx) => {
		const tabIds = new Set<string>();
		const folderIds = new Set<string>();

		for (const [index, folder] of session.folders.entries()) {
			if (folderIds.has(folder.id)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["folders", index, "id"],
					message: "Folder ids must be unique",
				});
				continue;
			}

			folderIds.add(folder.id);
		}

		for (const [index, tab] of session.tabs.entries()) {
			if (tabIds.has(tab.id)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["tabs", index, "id"],
					message: "Tab ids must be unique",
				});
				continue;
			}

			tabIds.add(tab.id);

			if (tab.parentFolderId && !folderIds.has(tab.parentFolderId)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["tabs", index, "parentFolderId"],
					message: "Tab parentFolderId must reference an existing folder",
				});
			}
		}

		if (session.activeTabId !== null && !tabIds.has(session.activeTabId)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["activeTabId"],
				message: "activeTabId must reference an existing tab",
			});
		}

		for (const [index, id] of session.mru.entries()) {
			if (!tabIds.has(id)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["mru", index],
					message: "mru ids must reference existing tabs",
				});
			}
		}
	});

export async function GET() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user?.id) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const workspaceSession = await getWorkspaceSession(session.user.id);
	return Response.json(workspaceSession);
}

export async function PATCH(request: Request) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user?.id) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const parsed = workspaceSessionSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: "Invalid input", details: parsed.error.flatten().fieldErrors },
			{ status: 400 },
		);
	}

	await upsertWorkspaceSession(session.user.id, parsed.data);
	return Response.json({ ok: true });
}
