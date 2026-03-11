export type WorkspaceRouteKind =
	| "repo"
	| "pull"
	| "issue"
	| "discussion"
	| "actions"
	| "search"
	| "file"
	| "dashboard";

export interface WorkspaceRouteClassification {
	kind: WorkspaceRouteKind;
	owner?: string;
	repo?: string;
	number?: number;
	path?: string;
	isCodeRoute?: boolean;
}

interface WorkspaceTabLike {
	href: string;
}

const NON_REPO_TOP_LEVEL_PATHS = new Set([
	"settings",
	"notifications",
	"search",
	"repos",
	"prs",
	"issues",
	"orgs",
	"users",
	"dashboard",
	"trending",
	"extension",
	"api",
	"collections",
]);

function toUrl(href: string): URL | null {
	const trimmed = href.trim();
	if (!trimmed) return null;

	try {
		if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
			return new URL(trimmed);
		}
		return new URL(trimmed, "https://example.com");
	} catch {
		return null;
	}
}

function toPathname(href: string): string {
	return toUrl(href)?.pathname ?? "/";
}

function normalizePath(pathname: string): string {
	if (pathname === "/") return pathname;
	return pathname.replace(/\/+$/, "") || "/";
}

function parsePositiveInt(value: string | undefined): number | undefined {
	if (!value || !/^\d+$/.test(value)) return undefined;
	const parsed = Number.parseInt(value, 10);
	if (parsed <= 0) return undefined;
	return parsed;
}

function safeDecode(segment: string): string {
	try {
		return decodeURIComponent(segment);
	} catch {
		return segment;
	}
}

function getFileName(path: string | undefined): string | undefined {
	if (!path) return undefined;
	const segments = path.split("/").filter(Boolean);
	const last = segments.at(-1);
	return last ? safeDecode(last) : undefined;
}

function routeKey(route: WorkspaceRouteClassification): string {
	if (route.kind === "dashboard") return "dashboard";
	if (!route.owner || !route.repo) return route.kind;

	switch (route.kind) {
		case "pull":
		case "issue":
		case "discussion":
			return `${route.kind}:${route.owner}/${route.repo}#${route.number ?? 0}`;
		case "file":
			return `file:${route.owner}/${route.repo}:${route.path ?? ""}`;
		case "repo":
			return `repo:${route.owner}/${route.repo}:${route.isCodeRoute ? "code" : "home"}`;
		default:
			return `${route.kind}:${route.owner}/${route.repo}:${route.path ?? ""}`;
	}
}

export function classifyWorkspaceRoute(href: string): WorkspaceRouteClassification {
	const pathname = normalizePath(toPathname(href));
	if (pathname === "/" || pathname === "/dashboard") {
		return { kind: "dashboard" };
	}

	const segments = pathname
		.split("/")
		.filter(Boolean)
		.map((segment) => safeDecode(segment));

	if (segments.length === 0) {
		return { kind: "dashboard" };
	}

	if (NON_REPO_TOP_LEVEL_PATHS.has(segments[0].toLowerCase())) {
		return { kind: "dashboard" };
	}

	if (segments.length < 2) {
		return { kind: "dashboard" };
	}

	const [owner, repo, section, ...rest] = segments;

	if (!section) return { kind: "repo", owner, repo };
	if (section === "code") return { kind: "repo", owner, repo, isCodeRoute: true };

	if (section === "pull" || section === "pulls") {
		return {
			kind: "pull",
			owner,
			repo,
			number: parsePositiveInt(rest[0]),
		};
	}

	if (section === "issue" || section === "issues") {
		return {
			kind: "issue",
			owner,
			repo,
			number: parsePositiveInt(rest[0]),
		};
	}

	if (section === "blob" || section === "tree") {
		return { kind: "file", owner, repo, path: rest.join("/") };
	}

	if (section === "actions") {
		return { kind: "actions", owner, repo, path: rest.join("/") };
	}

	if (section === "search") {
		return { kind: "search", owner, repo, path: rest.join("/") };
	}

	if (section === "discussion" || section === "discussions") {
		return {
			kind: "discussion",
			owner,
			repo,
			number: parsePositiveInt(rest[0]),
		};
	}

	return { kind: "repo", owner, repo };
}

export function canonicalizeWorkspaceTabHref(href: string): string {
	const url = toUrl(href);
	if (!url) return "/";

	const route = classifyWorkspaceRoute(url.pathname);
	if (route.kind === "pull") {
		url.searchParams.delete("file");
	}

	const search = url.searchParams.toString();
	return `${normalizePath(url.pathname)}${search ? `?${search}` : ""}`;
}

export function getWorkspaceTabTitle(href: string): string {
	const route = classifyWorkspaceRoute(href);

	if (route.kind === "dashboard") return "Dashboard";
	if (!route.repo) return "Workspace";

	if (route.kind === "pull") return `PR #${route.number ?? "?"} · ${route.repo}`;
	if (route.kind === "issue") return `Issue #${route.number ?? "?"} · ${route.repo}`;
	if (route.kind === "discussion") {
		return `Discussion #${route.number ?? "?"} · ${route.repo}`;
	}
	if (route.kind === "actions") return `Actions · ${route.repo}`;
	if (route.kind === "search") return `Search · ${route.repo}`;
	if (route.kind === "file") {
		const name = getFileName(route.path) ?? "File";
		return `${name} · ${route.repo}`;
	}
	if (route.kind === "repo" && route.isCodeRoute) return `${route.repo} · Code`;

	return route.repo;
}

export function isSameWorkspaceTarget(a: string, b: string): boolean {
	return routeKey(classifyWorkspaceRoute(a)) === routeKey(classifyWorkspaceRoute(b));
}

export function shouldPromoteRouteToStandaloneTab(href: string): boolean {
	const route = classifyWorkspaceRoute(href);
	if (route.kind === "dashboard") return false;
	return Boolean(route.owner && route.repo);
}

export function inferFolderNameFromTabs(tabs: WorkspaceTabLike[]): string {
	const counts = new Map<string, number>();
	let fallback: string | null = null;

	for (const tab of tabs) {
		const route = classifyWorkspaceRoute(tab.href);
		if (!route.repo) continue;
		fallback = fallback ?? route.repo;
		counts.set(route.repo, (counts.get(route.repo) ?? 0) + 1);
	}

	let bestName = fallback;
	let bestCount = 0;
	for (const [name, count] of counts) {
		if (count > bestCount) {
			bestCount = count;
			bestName = name;
		}
	}

	return bestName ?? "Workspace";
}
