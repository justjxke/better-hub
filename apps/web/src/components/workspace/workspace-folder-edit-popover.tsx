"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Folder } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { WorkspaceFolder } from "./workspace-types";
import {
	WORKSPACE_FOLDER_ICON_OPTIONS,
	WorkspaceFolderIconPicker,
} from "./workspace-folder-icon-picker";

const WORKSPACE_FOLDER_COLOR_OPTIONS = [
	{ value: "slate", className: "bg-slate-400" },
	{ value: "blue", className: "bg-blue-400" },
	{ value: "emerald", className: "bg-emerald-400" },
	{ value: "amber", className: "bg-amber-400" },
	{ value: "rose", className: "bg-rose-400" },
	{ value: "violet", className: "bg-violet-400" },
] as const;

type WorkspaceFolderEditPatch = Partial<Pick<WorkspaceFolder, "name" | "icon" | "color">>;

interface WorkspaceFolderEditPopoverProps {
	folder: WorkspaceFolder;
	onUpdate: (patch: WorkspaceFolderEditPatch) => void;
	children: ReactNode;
}

export function getWorkspaceFolderIconComponent(icon: string) {
	return (
		WORKSPACE_FOLDER_ICON_OPTIONS.find((option) => option.value === icon)?.Icon ??
		Folder
	);
}

export function WorkspaceFolderEditPopover({
	folder,
	onUpdate,
	children,
}: WorkspaceFolderEditPopoverProps) {
	const [nameDraft, setNameDraft] = useState(folder.name);

	useEffect(() => {
		setNameDraft(folder.name);
	}, [folder.id, folder.name]);

	const commitName = () => {
		const trimmedName = nameDraft.trim();
		if (!trimmedName) {
			setNameDraft(folder.name);
			return;
		}
		if (trimmedName !== folder.name) {
			onUpdate({ name: trimmedName });
		}
	};

	return (
		<PopoverPrimitive.Root>
			<PopoverPrimitive.Trigger asChild>{children}</PopoverPrimitive.Trigger>
			<PopoverPrimitive.Portal>
				<PopoverPrimitive.Content
					side="bottom"
					align="start"
					sideOffset={6}
					className="z-50 w-56 rounded-md border bg-background p-2 shadow-md"
				>
					<div className="space-y-2">
						<input
							value={nameDraft}
							onChange={(event) =>
								setNameDraft(event.target.value)
							}
							onBlur={commitName}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									commitName();
									event.currentTarget.blur();
								}
								if (event.key === "Escape") {
									setNameDraft(folder.name);
									event.currentTarget.blur();
								}
							}}
							className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none transition-colors focus:border-foreground/30"
							placeholder="Folder name"
						/>
						<WorkspaceFolderIconPicker
							value={folder.icon}
							onChange={(icon) => onUpdate({ icon })}
						/>
						<div className="grid grid-cols-6 gap-1">
							{WORKSPACE_FOLDER_COLOR_OPTIONS.map(
								(option) => {
									const isActive =
										folder.color ===
										option.value;
									return (
										<button
											key={
												option.value
											}
											type="button"
											onClick={() =>
												onUpdate(
													{
														color: option.value,
													},
												)
											}
											className={cn(
												"h-5 w-5 rounded-full border transition-transform",
												option.className,
												isActive
													? "scale-110 border-foreground"
													: "border-transparent hover:scale-105",
											)}
											title={
												option.value
											}
										/>
									);
								},
							)}
						</div>
					</div>
				</PopoverPrimitive.Content>
			</PopoverPrimitive.Portal>
		</PopoverPrimitive.Root>
	);
}
