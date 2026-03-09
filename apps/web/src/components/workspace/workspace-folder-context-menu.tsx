"use client";

import { FolderOpen, FolderX } from "lucide-react";
import type { ReactNode } from "react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface WorkspaceFolderContextMenuProps {
	onDeleteKeepTabs: () => void;
	onDeleteRemoveTabs: () => void;
	children: ReactNode;
}

export function WorkspaceFolderContextMenu({
	onDeleteKeepTabs,
	onDeleteRemoveTabs,
	children,
}: WorkspaceFolderContextMenuProps) {
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className="w-60">
				<ContextMenuItem onSelect={onDeleteKeepTabs}>
					<FolderOpen className="size-4" />
					Delete folder and keep tabs
				</ContextMenuItem>
				<ContextMenuItem onSelect={onDeleteRemoveTabs}>
					<FolderX className="size-4" />
					Delete folder and remove tabs
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
