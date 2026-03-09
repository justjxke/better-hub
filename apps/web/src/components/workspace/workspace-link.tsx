"use client";

import Link, { type LinkProps } from "next/link";
import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from "react";
import { useWorkspaceNavigation } from "@/components/workspace/use-workspace-navigation";

type WorkspaceLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
	Pick<LinkProps, "href" | "prefetch" | "replace" | "scroll">;

export const WorkspaceLink = forwardRef<HTMLAnchorElement, WorkspaceLinkProps>(
	function WorkspaceLink({ href, onClick, ...props }, ref) {
		const { handleAnchorIntent } = useWorkspaceNavigation();

		function handleClick(e: MouseEvent<HTMLAnchorElement>) {
			onClick?.(e);
			if (e.defaultPrevented) return;

			const url = e.currentTarget.href;
			const handled = handleAnchorIntent({
				href: url,
				metaKey: e.metaKey,
				ctrlKey: e.ctrlKey,
				shiftKey: e.shiftKey,
				altKey: e.altKey,
				button: e.button,
				target: e.currentTarget.getAttribute("target"),
				download: e.currentTarget.hasAttribute("download"),
			});
			if (handled) e.preventDefault();
		}

		return <Link ref={ref} href={href} onClick={handleClick} {...props} />;
	},
);
