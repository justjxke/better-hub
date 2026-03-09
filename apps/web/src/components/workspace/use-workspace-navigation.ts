"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toInternalUrl } from "@/lib/github-utils";
import { useWorkspaceTabs } from "./workspace-provider";

interface AnchorIntentOptions {
	href: string;
	metaKey: boolean;
	ctrlKey: boolean;
	shiftKey: boolean;
	altKey: boolean;
	button: number;
	target?: string | null;
	download?: boolean;
}

function toWorkspaceHref(href: string): string | null {
	if (!href) return null;

	if (href.startsWith("/")) return href;

	try {
		const url = new URL(href);
		if (typeof window !== "undefined" && url.host === window.location.host) {
			return `${url.pathname}${url.search}${url.hash}`;
		}

		if (url.hostname === "github.com") {
			const internal = toInternalUrl(href);
			return internal === href ? null : internal;
		}
	} catch {
		return null;
	}

	return null;
}

function isSamePathHashNavigation(href: string): boolean {
	if (typeof window === "undefined") return false;

	try {
		const next = new URL(href, window.location.href);
		if (!next.hash) return false;

		return (
			next.origin === window.location.origin &&
			next.pathname === window.location.pathname &&
			next.search === window.location.search
		);
	} catch {
		return false;
	}
}

export function useWorkspaceNavigation() {
	const router = useRouter();
	const { replaceCurrentTabWithHref, openHrefInNewTab } = useWorkspaceTabs();

	const navigateInCurrentTab = useCallback(
		(href: string) => {
			replaceCurrentTabWithHref(href);
			router.push(href);
		},
		[replaceCurrentTabWithHref, router],
	);

	const openInNewWorkspaceTab = useCallback(
		(href: string) => {
			openHrefInNewTab(href);
			router.push(href);
		},
		[openHrefInNewTab, router],
	);

	const handleAnchorIntent = useCallback(
		(intent: AnchorIntentOptions): boolean => {
			if (intent.download) return false;

			const target = intent.target?.trim().toLowerCase();
			if (target && target !== "_self") return false;

			if (isSamePathHashNavigation(intent.href)) return false;

			const workspaceHref = toWorkspaceHref(intent.href);
			if (!workspaceHref) return false;

			const isExplicitNewTabIntent =
				intent.metaKey ||
				intent.ctrlKey ||
				intent.shiftKey ||
				intent.button === 1;
			if (isExplicitNewTabIntent) {
				openInNewWorkspaceTab(workspaceHref);
				return true;
			}

			const isNormalLeftClick =
				intent.button === 0 &&
				!intent.metaKey &&
				!intent.ctrlKey &&
				!intent.shiftKey &&
				!intent.altKey;
			if (!isNormalLeftClick) return false;

			navigateInCurrentTab(workspaceHref);
			return true;
		},
		[navigateInCurrentTab, openInNewWorkspaceTab],
	);

	return {
		navigateInCurrentTab,
		openInNewWorkspaceTab,
		handleAnchorIntent,
	};
}
