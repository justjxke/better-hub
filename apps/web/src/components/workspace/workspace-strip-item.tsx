"use client";

import type { WorkspaceTab } from "@/components/workspace/workspace-types";
import { cn } from "@/lib/utils";

interface WorkspaceStripItemProps {
	tab: WorkspaceTab;
	active: boolean;
	onSelect: (tab: WorkspaceTab) => void;
}

export function WorkspaceStripItem({ tab, active, onSelect }: WorkspaceStripItemProps) {
	return (
		<button
			type="button"
			onClick={() => onSelect(tab)}
			className={cn(
				"shrink-0 max-w-56 truncate rounded-md border px-2.5 py-1.5 text-xs transition-colors",
				active
					? "border-foreground/20 bg-muted text-foreground"
					: "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50",
			)}
			title={tab.title || tab.href}
		>
			{tab.title}
		</button>
	);
}
