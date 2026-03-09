import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { OnboardingOverlay } from "@/components/onboarding/onboarding-overlay";
import { AppNavbar } from "@/components/layout/navbar";
import { GitHubLinkInterceptor } from "@/components/shared/github-link-interceptor";
import { GlobalChatPanel } from "@/components/shared/global-chat-panel";
import { GlobalChatProvider } from "@/components/shared/global-chat-provider";
import { MutationEventProvider } from "@/components/shared/mutation-event-provider";
import { NavigationProgress } from "@/components/shared/navigation-progress";
import { ColorThemeProvider } from "@/components/theme/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceProvider } from "@/components/workspace/workspace-provider";
import { type GhostTabState } from "@/lib/chat-store";
import { getServerSession } from "@/lib/auth";
import { getNotifications, checkIsStarred } from "@/lib/github";
import type { NotificationItem } from "@/lib/github-types";
import { getWorkspaceSession } from "@/lib/workspace-tabs-store";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
	const session = await getServerSession();
	if (!session) {
		const headersList = await headers();
		const pathname = headersList.get("x-pathname") || "";
		const redirectTo =
			pathname && pathname !== "/"
				? `/?redirect=${encodeURIComponent(pathname)}`
				: "/";
		return redirect(redirectTo);
	}

	const workspaceSession = await getWorkspaceSession(session.user.id);

	let notifications: NotificationItem[] = [];
	try {
		notifications = (await getNotifications(20)) as NotificationItem[];
	} catch {
		// Swallow rate-limit / network errors so the layout still renders.
		// Individual pages will throw their own errors caught by error.tsx.
	}

	const onboardingDone = session?.user?.onboardingDone ?? false;
	let initialStarredAuth = false;
	let initialStarredHub = false;
	if (!onboardingDone) {
		try {
			[initialStarredAuth, initialStarredHub] = await Promise.all([
				checkIsStarred("better-auth", "better-auth"),
				checkIsStarred("better-auth", "better-hub"),
			]);
		} catch {
			// Same — don't let secondary API failures crash the shell.
		}
	}

	const freshTabId = crypto.randomUUID();
	const initialTabState: GhostTabState = {
		tabs: [{ id: freshTabId, label: "New chat" }],
		activeTabId: freshTabId,
		counter: 1,
	};

	return (
		<NuqsAdapter>
			<WorkspaceProvider initialSession={workspaceSession}>
				<GlobalChatProvider initialTabState={initialTabState}>
					<MutationEventProvider>
						<ColorThemeProvider>
							<GitHubLinkInterceptor>
								<TooltipProvider>
									<NavigationProgress />
									<div className="flex h-dvh flex-col overflow-y-auto lg:overflow-hidden">
										<AppNavbar
											session={
												session
											}
											notifications={
												notifications
											}
										/>
										<div className="mt-10 flex flex-col overflow-x-hidden px-2 pt-2 sm:px-4 lg:h-[calc(100dvh-var(--spacing)*10)] lg:overflow-auto">
											{children}
										</div>
										<Suspense>
											<GlobalChatPanel />
										</Suspense>
									</div>
									<OnboardingOverlay
										userName={
											session
												?.githubUser
												?.name ||
											session
												?.githubUser
												?.login ||
											""
										}
										userAvatar={
											session
												?.githubUser
												?.avatar_url ||
											""
										}
										bio={
											session
												?.githubUser
												?.bio ||
											""
										}
										company={
											session
												?.githubUser
												?.company ||
											""
										}
										location={
											session
												?.githubUser
												?.location ||
											""
										}
										publicRepos={
											session
												?.githubUser
												?.public_repos ??
											0
										}
										followers={
											session
												?.githubUser
												?.followers ??
											0
										}
										createdAt={
											session
												?.githubUser
												?.created_at ||
											""
										}
										onboardingDone={
											onboardingDone
										}
										initialStarredAuth={
											initialStarredAuth
										}
										initialStarredHub={
											initialStarredHub
										}
									/>
								</TooltipProvider>
							</GitHubLinkInterceptor>
						</ColorThemeProvider>
					</MutationEventProvider>
				</GlobalChatProvider>
			</WorkspaceProvider>
		</NuqsAdapter>
	);
}
