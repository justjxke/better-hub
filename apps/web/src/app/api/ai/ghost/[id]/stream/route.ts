import { auth } from "@/lib/auth";
import { getConversationById } from "@/lib/chat-store";
import { streamContext } from "@/lib/resumable-stream";
import { headers } from "next/headers";

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user?.id) {
		return new Response("Unauthorized", { status: 401 });
	}

	const { id: conversationId } = await params;

	const conversation = await getConversationById(conversationId);
	if (!conversation) {
		return new Response("Not found", { status: 404 });
	}

	if (conversation.userId !== session.user.id) {
		return new Response("Forbidden", { status: 403 });
	}

	if (!conversation.activeStreamId) {
		return new Response(null, { status: 204 });
	}

	const resumeAt = new URL(req.url).searchParams.get("resumeAt");
	const stream = await streamContext.resumeExistingStream(
		conversation.activeStreamId,
		resumeAt ? parseInt(resumeAt, 10) : undefined,
	);

	if (!stream) {
		return new Response(null, { status: 204 });
	}

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
		},
	});
}
