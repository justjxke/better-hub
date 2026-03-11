"use client";

import { FolderOpen, FolderPen, FolderX } from "lucide-react";
import type { ReactNode } from "react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface WorkspaceFolderContextMenuProps {
	onRename: () => void;
	onDeleteKeepTabs: () => void;
	onDeleteRemoveTabs: () => void;
	children: ReactNode;
}

export function WorkspaceFolderContextMenu({
	onRename,
	onDeleteKeepTabs,
	onDeleteRemoveTabs,
	children,
}: WorkspaceFolderContextMenuProps) {
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className="w-60">
				<ContextMenuItem onSelect={onRename}>
					<FolderPen className="size-4" />
					Rename folder
				</ContextMenuItem>
				<ContextMenuSeparator />
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
