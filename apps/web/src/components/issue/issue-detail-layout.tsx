"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
	IssueOptimisticCommentsProvider,
	useIssueOptimisticCommentsData,
} from "./issue-optimistic-comments-provider";
import Image from "next/image";
import { TimeAgo } from "@/components/ui/time-ago";
import { ClientMarkdown } from "@/components/shared/client-markdown";

interface IssueDetailLayoutProps {
	header: React.ReactNode;
	timeline: React.ReactNode;
	commentForm?: React.ReactNode;
	sidebar?: React.ReactNode;
	commentCount: number;
}

function OptimisticCommentsDisplay() {
	const comments = useIssueOptimisticCommentsData();
	const endRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (comments.length > 0) {
			endRef.current?.scrollIntoView({
				behavior: "smooth",
				block: "end",
			});
		}
	}, [comments.length]);

	if (comments.length === 0) return null;

	return (
		<div className="space-y-3 mt-4">
			{comments.map((c) => (
				<div
					key={c.id}
					className="border border-border/60 rounded-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
				>
					<div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/60 bg-muted/40">
						{c.userAvatarUrl ? (
							<Image
								src={c.userAvatarUrl}
								alt=""
								width={16}
								height={16}
								className="rounded-full shrink-0"
							/>
						) : (
							<div className="w-4 h-4 rounded-full bg-muted-foreground shrink-0" />
						)}
						<span className="text-xs font-medium text-foreground/80">
							{c.userName || "You"}
						</span>
						<span className="text-[10px] text-muted-foreground ml-auto shrink-0">
							<TimeAgo date={c.created_at} />
						</span>
					</div>
					<div className="px-3 py-2.5 text-sm">
						<ClientMarkdown content={c.body} />
					</div>
				</div>
			))}
			<div ref={endRef} />
		</div>
	);
}

function IssueDetailLayoutInner({
	header,
	timeline,
	commentForm,
	sidebar,
}: {
	header: React.ReactNode;
	timeline: React.ReactNode;
	commentForm?: React.ReactNode;
	sidebar?: React.ReactNode;
}) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [canScrollUp, setCanScrollUp] = useState(false);
	const [canScrollDown, setCanScrollDown] = useState(false);

	const updateScrollState = useCallback(() => {
		const el = scrollRef.current;
		if (!el) return;
		setCanScrollUp(el.scrollTop > 0);
		setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
	}, []);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		updateScrollState();
		el.addEventListener("scroll", updateScrollState);
		const resizeObserver = new ResizeObserver(updateScrollState);
		resizeObserver.observe(el);
		return () => {
			el.removeEventListener("scroll", updateScrollState);
			resizeObserver.disconnect();
		};
	}, [updateScrollState]);

	return (
		<div className="flex-1 min-h-0 flex flex-col">
			<div className="shrink-0 pt-3">{header}</div>

			<div className="flex-1 min-h-0 flex gap-6">
				{/* Main thread */}
				<div className="relative flex-1 min-w-0">
					{/* Top shadow */}
					<div
						className={cn(
							"pointer-events-none absolute top-0 left-0 right-4 h-6 bg-gradient-to-b from-background to-transparent z-10 transition-opacity duration-200",
							canScrollUp ? "opacity-100" : "opacity-0",
						)}
					/>
					{/* Bottom shadow */}
					<div
						className={cn(
							"pointer-events-none absolute bottom-0 left-0 right-4 h-6 bg-gradient-to-t from-background to-transparent z-10 transition-opacity duration-200",
							canScrollDown ? "opacity-100" : "opacity-0",
						)}
					/>
					<div
						ref={scrollRef}
						className="h-full overflow-y-auto pb-8 pr-4"
					>
						<div>
							{/* Mobile sidebar */}
							{sidebar && (
								<div className="lg:hidden space-y-5 mb-6 pb-4 border-b border-border/40">
									{sidebar}
								</div>
							)}

							<div className="space-y-3">{timeline}</div>

							<OptimisticCommentsDisplay />

							{commentForm && (
								<div className="mt-6 pt-4 border-t border-border/40">
									{commentForm}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Right sidebar */}
				{sidebar && (
					<div className="hidden lg:block w-[240px] xl:w-[280px] 2xl:w-[320px] shrink-0 border-l border-border/40 pl-6 overflow-y-auto pb-8">
						<div className="space-y-5 pt-1">{sidebar}</div>
					</div>
				)}
			</div>
		</div>
	);
}

export function IssueDetailLayout({
	header,
	timeline,
	commentForm,
	sidebar,
	commentCount,
}: IssueDetailLayoutProps) {
	return (
		<IssueOptimisticCommentsProvider serverCommentCount={commentCount}>
			<IssueDetailLayoutInner
				header={header}
				timeline={timeline}
				commentForm={commentForm}
				sidebar={sidebar}
			/>
		</IssueOptimisticCommentsProvider>
	);
}
