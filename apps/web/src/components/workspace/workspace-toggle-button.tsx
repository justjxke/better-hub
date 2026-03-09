"use client";

import { PanelsTopLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import { useWorkspaceTabs } from "@/components/workspace/workspace-provider";
import { cn } from "@/lib/utils";

export function WorkspaceToggleButton() {
	const pathname = usePathname();
	const { stripOpen, seedCurrentPageIfEmpty, toggleStrip } = useWorkspaceTabs();

	const handleToggle = () => {
		if (!stripOpen) {
			seedCurrentPageIfEmpty(pathname);
		}
		toggleStrip();
	};

	return (
		<button
			type="button"
			onClick={handleToggle}
			aria-pressed={stripOpen}
			className={cn(
				"relative flex items-center justify-center",
				"w-7 h-7 rounded-md",
				"text-muted-foreground/60 hover:text-foreground",
				"cursor-pointer transition-all duration-200",
				stripOpen && "text-foreground",
			)}
			title="Workspace tabs"
		>
			<PanelsTopLeft className="w-4 h-4" />
		</button>
	);
}
