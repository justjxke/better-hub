import { describe, expect, it } from "bun:test";

import {
	classifyWorkspaceRoute,
	getWorkspaceTabTitle,
	inferFolderNameFromTabs,
	isSameWorkspaceTarget,
	shouldPromoteRouteToStandaloneTab,
} from "./workspace-route";

describe("workspace-route", () => {
	it("classifies pull routes", () => {
		expect(classifyWorkspaceRoute("/better-auth/better-hub/pulls/258").kind).toBe(
			"pull",
		);
	});

	it("formats code route tab titles", () => {
		expect(getWorkspaceTabTitle("/better-auth/better-hub/code")).toBe(
			"better-hub · Code",
		);
	});

	it("formats blob route tab titles with filename", () => {
		expect(
			getWorkspaceTabTitle(
				"/better-auth/better-hub/blob/main/src/app/layout.tsx",
			),
		).toContain("layout.tsx");
	});

	it("formats discussion, actions, and search tab titles", () => {
		expect(getWorkspaceTabTitle("/better-auth/better-hub/discussions/7")).toBe(
			"Discussion #7 · better-hub",
		);
		expect(getWorkspaceTabTitle("/better-auth/better-hub/actions")).toBe(
			"Actions · better-hub",
		);
		expect(getWorkspaceTabTitle("/better-auth/better-hub/search/code")).toBe(
			"Search · better-hub",
		);
	});

	it("matches equivalent targets despite query strings", () => {
		expect(
			isSameWorkspaceTarget(
				"/better-auth/better-hub/issues/12",
				"/better-auth/better-hub/issues/12?comment=1",
			),
		).toBe(true);
	});

	it("treats different discussion ids as different targets", () => {
		expect(
			isSameWorkspaceTarget(
				"/better-auth/better-hub/discussions/1",
				"/better-auth/better-hub/discussions/2",
			),
		).toBe(false);
	});

	it("normalizes absolute urls when comparing targets", () => {
		expect(
			isSameWorkspaceTarget(
				"https://better-auth.com/better-auth/better-hub/issues/12",
				"/better-auth/better-hub/issues/12",
			),
		).toBe(true);
	});

	it("promotes pull routes to standalone tabs", () => {
		expect(shouldPromoteRouteToStandaloneTab("/better-auth/better-hub/pulls/258")).toBe(
			true,
		);
	});

	it("does not promote global app routes to standalone tabs", () => {
		expect(shouldPromoteRouteToStandaloneTab("/settings/profile")).toBe(false);
		expect(shouldPromoteRouteToStandaloneTab("/notifications")).toBe(false);
	});

	it("infers folder name from repo tabs", () => {
		expect(
			inferFolderNameFromTabs([
				{ href: "/better-auth/better-hub/code" },
				{ href: "/better-auth/better-hub/issues/1" },
			]),
		).toBe("better-hub");
	});
});
