import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { auth } from "./auth";
import { dashClient } from "@better-auth/infra/client";
import { stripeClient } from "@better-auth/stripe/client";

export const authClient = createAuthClient({
	plugins: [
		inferAdditionalFields<typeof auth>(),
		dashClient(),
		stripeClient({ subscription: true }),
	],
});

export const { signIn, signOut, useSession } = authClient;
