"use client";

import { useState, type ReactNode } from "react";
import { MessageActionsMenu } from "./message-actions-menu";
import { useDeletedComments } from "./deleted-comments-context";

interface ChatMessageWrapperProps {
	headerContent: ReactNode;
	bodyContent: ReactNode;
	reactionsContent: ReactNode;
	owner: string;
	repo: string;
	pullNumber: number;
	commentId: number;
	body: string;
}

export function ChatMessageWrapper({
	headerContent,
	bodyContent,
	reactionsContent,
	owner,
	repo,
	pullNumber,
	commentId,
	body,
}: ChatMessageWrapperProps) {
	const [deleted, setDeleted] = useState(false);
	const deletedContext = useDeletedComments();

	if (deleted) {
		return null;
	}

	const handleDelete = () => {
		setDeleted(true);
		deletedContext?.markDeleted();
	};

	return (
		<div className="group">
			<div className="border border-border/60 rounded-lg overflow-hidden">
				<div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/60 bg-card/50">
					{headerContent}
					<MessageActionsMenu
						owner={owner}
						repo={repo}
						pullNumber={pullNumber}
						commentId={commentId}
						body={body}
						onDelete={handleDelete}
					/>
				</div>
				{bodyContent}
				<div className="px-3 pb-2">{reactionsContent}</div>
			</div>
		</div>
	);
}
