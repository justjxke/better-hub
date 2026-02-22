import { createResumableStreamContext } from "resumable-stream/generic";
import type { Publisher, Subscriber } from "resumable-stream/generic";
import { after } from "next/server";
import Redis from "ioredis";

function getRedisUrl(): string {
	const url =
		process.env.REDIS_URL ??
		process.env.KV_URL ??
		process.env.UPSTASH_REDIS_URL;
	if (!url) {
		throw new Error(
			"Missing Redis TCP URL. Set REDIS_URL, KV_URL, or UPSTASH_REDIS_URL.",
		);
	}
	return url;
}

function createPublisher(): Publisher {
	const client = new Redis(getRedisUrl());
	return {
		connect: () => Promise.resolve(),
		publish: (channel, message) => client.publish(channel, message),
		set: (key, value, options) => {
			if (options?.EX) {
				return client.set(key, value, "EX", options.EX);
			}
			return client.set(key, value);
		},
		get: (key) => client.get(key),
		incr: (key) => client.incr(key),
	};
}

function createSubscriber(): Subscriber {
	const client = new Redis(getRedisUrl());
	const handlers = new Map<string, (message: string) => void>();
	const messageListener = (channel: string, message: string) => {
		const handler = handlers.get(channel);
		if (handler) handler(message);
	};

	return {
		connect: () => Promise.resolve(),
		subscribe: async (channel, callback) => {
			if (handlers.size === 0) {
				client.on("message", messageListener);
			}
			handlers.set(channel, callback);
			await client.subscribe(channel);
		},
		unsubscribe: async (channel) => {
			handlers.delete(channel);
			if (handlers.size === 0) {
				client.removeListener("message", messageListener);
			}
			return client.unsubscribe(channel);
		},
	};
}

export const streamContext = createResumableStreamContext({
	waitUntil: after,
	publisher: createPublisher(),
	subscriber: createSubscriber(),
});
