import { createResumableStreamContext } from "resumable-stream";
import { after } from "next/server";

export const streamContext = createResumableStreamContext({
	waitUntil: after,
});
