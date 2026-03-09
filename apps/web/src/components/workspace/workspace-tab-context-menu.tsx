"use client";

import { FolderPlus, FolderTree, SquareStack, X, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { WorkspaceFolder, WorkspaceTab } from "./workspace-types";

interface WorkspaceTabContextMenuProps {
	tab: WorkspaceTab;
	folders: WorkspaceFolder[];
	onDuplicate: () => void;
	onClose: () => void;
	onCloseOthers: () => void;
	onMoveToFolder: (folderId: string | null) => void;
	onAddToNewFolder: () => void;
	children: ReactNode;
}

export function WorkspaceTabContextMenu({
	tab,
	folders,
	onDuplicate,
	onClose,
	onCloseOthers,
	onMoveToFolder,
	onAddToNewFolder,
	children,
}: WorkspaceTabContextMenuProps) {
	const availableFolders = folders.filter((folder) => folder.id !== tab.parentFolderId);

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className="w-56">
				<ContextMenuItem onSelect={onDuplicate}>
					<SquareStack className="size-4" />
					Duplicate tab
				</ContextMenuItem>
				<ContextMenuItem onSelect={onClose}>
					<X className="size-4" />
					Close tab
				</ContextMenuItem>
				<ContextMenuItem onSelect={onCloseOthers}>
					<XCircle className="size-4" />
					Close other tabs
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuLabel className="text-xs">
					Move/Add to folder
				</ContextMenuLabel>
				<ContextMenuItem onSelect={onAddToNewFolder}>
					<FolderPlus className="size-4" />
					Add to new folder
				</ContextMenuItem>
				{tab.parentFolderId ? (
					<ContextMenuItem onSelect={() => onMoveToFolder(null)}>
						<FolderTree className="size-4" />
						Remove from folder
					</ContextMenuItem>
				) : null}
				{availableFolders.map((folder) => (
					<ContextMenuItem
						key={folder.id}
						onSelect={() => onMoveToFolder(folder.id)}
					>
						<FolderTree className="size-4" />
						{folder.name}
					</ContextMenuItem>
				))}
			</ContextMenuContent>
		</ContextMenu>
	);
}
