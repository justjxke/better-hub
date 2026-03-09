"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useWorkspaceTabs } from "@/components/workspace/workspace-provider";
import type { WorkspaceTab } from "@/components/workspace/workspace-types";
import { cn } from "@/lib/utils";
import { WorkspaceStripItem } from "./workspace-strip-item";

type WorkspaceNewTabBehavior = "dashboard" | "duplicate";

interface UserSettingsResponse {
	workspaceNewTabBehavior?: string;
}

export function WorkspaceStrip() {
	const router = useRouter();
	const pathname = usePathname();
	const { stripOpen, tabs, activeTabId, activateTab, openHrefInNewTab, duplicateCurrentTab } =
		useWorkspaceTabs();
	const [newTabBehavior, setNewTabBehavior] = useState<WorkspaceNewTabBehavior>("dashboard");

	useEffect(() => {
		let cancelled = false;

		fetch("/api/user-settings")
			.then(async (response) => {
				if (!response.ok) return;
				const data = (await response.json()) as UserSettingsResponse;
				if (cancelled) return;
				setNewTabBehavior(
					data.workspaceNewTabBehavior === "duplicate"
						? "duplicate"
						: "dashboard",
				);
			})
			.catch(() => {});

		return () => {
			cancelled = true;
		};
	}, []);

	if (!stripOpen) return null;

	const handleSelectTab = (tab: WorkspaceTab) => {
		activateTab(tab.id);
		if (pathname !== tab.href) {
			router.push(tab.href);
		}
	};

	const handleAddTab = () => {
		if (newTabBehavior === "duplicate") {
			const currentTab =
				tabs.find((tab) => tab.id === activeTabId) ??
				tabs.find((tab) => tab.href === pathname);

			if (!currentTab) {
				openHrefInNewTab("/dashboard");
				if (pathname !== "/dashboard") {
					router.push("/dashboard");
				}
				return;
			}

			duplicateCurrentTab();
			if (pathname !== currentTab.href) {
				router.push(currentTab.href);
			}
			return;
		}

		openHrefInNewTab("/dashboard");
		if (pathname !== "/dashboard") {
			router.push("/dashboard");
		}
	};

	return (
		<div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-background/95 px-2 py-1.5 sm:px-4">
			{tabs.map((tab) => (
				<WorkspaceStripItem
					key={tab.id}
					tab={tab}
					active={tab.id === activeTabId}
					onSelect={handleSelectTab}
				/>
			))}
			<button
				type="button"
				onClick={handleAddTab}
				className={cn(
					"shrink-0 rounded-md border border-border p-1.5 text-muted-foreground transition-colors",
					"hover:bg-muted/50 hover:text-foreground",
				)}
				title="New workspace tab"
			>
				<Plus className="h-3.5 w-3.5" />
			</button>
		</div>
	);
}
