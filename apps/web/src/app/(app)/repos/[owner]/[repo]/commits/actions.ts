"use server";

import { getRepoCommits, fetchAndCacheRepoPageData } from "@/lib/github";

export async function fetchCommitsByDate(
	owner: string,
	repo: string,
	since?: string,
	until?: string,
	branch?: string,
) {
	return getRepoCommits(
		owner,
		repo,
		branch || undefined,
		1,
		30,
		since || undefined,
		until || undefined,
	);
}

export async function fetchLatestCommit(owner: string, repo: string) {
	const data = await fetchAndCacheRepoPageData(owner, repo);
	return data?.latestCommit ?? null;
}
