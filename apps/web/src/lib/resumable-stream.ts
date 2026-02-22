import { createResumableStreamContext } from "resumable-stream/ioredis";
import { after } from "next/server";

export const streamContext = createResumableStreamContext({
	waitUntil: after,
});
