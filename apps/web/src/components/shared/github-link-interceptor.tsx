"use client";

import { useEffect, useRef } from "react";
import { useWorkspaceNavigation } from "@/components/workspace/use-workspace-navigation";

export function GitHubLinkInterceptor({ children }: { children: React.ReactNode }) {
	const ref = useRef<HTMLDivElement>(null);
	const { handleAnchorIntent } = useWorkspaceNavigation();

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		function handleClick(e: MouseEvent) {
			if (e.defaultPrevented) return;

			const anchor = (e.target as HTMLElement).closest("a");
			if (!anchor) return;
			if (anchor.hasAttribute("data-no-github-intercept")) return;

			const href = anchor.href;
			if (!href) return;

			const wasHandled = handleAnchorIntent({
				href,
				metaKey: e.metaKey,
				ctrlKey: e.ctrlKey,
				shiftKey: e.shiftKey,
				altKey: e.altKey,
				button: e.button,
				target: anchor.getAttribute("target"),
				download: anchor.hasAttribute("download"),
			});
			if (!wasHandled) return;

			e.preventDefault();
		}

		el.addEventListener("click", handleClick);
		return () => el.removeEventListener("click", handleClick);
	}, [handleAnchorIntent]);

	return <div ref={ref}>{children}</div>;
}
