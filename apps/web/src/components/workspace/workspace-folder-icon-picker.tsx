"use client";

import { Briefcase, Code2, FileText, Folder, Heart, Lightbulb, Rocket, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceFolderIconOption {
	value: string;
	label: string;
	Icon: typeof Folder;
}

export const WORKSPACE_FOLDER_ICON_OPTIONS: WorkspaceFolderIconOption[] = [
	{ value: "folder", label: "Folder", Icon: Folder },
	{ value: "briefcase", label: "Work", Icon: Briefcase },
	{ value: "code", label: "Code", Icon: Code2 },
	{ value: "note", label: "Notes", Icon: FileText },
	{ value: "idea", label: "Ideas", Icon: Lightbulb },
	{ value: "launch", label: "Launch", Icon: Rocket },
	{ value: "favorite", label: "Favorites", Icon: Star },
	{ value: "heart", label: "Personal", Icon: Heart },
];

interface WorkspaceFolderIconPickerProps {
	value: string;
	onChange: (value: string) => void;
}

export function WorkspaceFolderIconPicker({ value, onChange }: WorkspaceFolderIconPickerProps) {
	return (
		<div className="grid grid-cols-4 gap-1">
			{WORKSPACE_FOLDER_ICON_OPTIONS.map((option) => {
				const isActive = option.value === value;
				return (
					<button
						key={option.value}
						type="button"
						onClick={() => onChange(option.value)}
						className={cn(
							"inline-flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-colors",
							isActive
								? "border-foreground/30 bg-muted text-foreground"
								: "border-border hover:bg-muted/60 hover:text-foreground",
						)}
						title={option.label}
					>
						<option.Icon className="size-3.5" />
					</button>
				);
			})}
		</div>
	);
}
