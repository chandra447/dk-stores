import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { DataModel } from "./_generated/dataModel";

/**
 * Password provider configuration.
 *
 * NOTE: Do NOT set `id` explicitly - the Password provider already uses "password"
 * as its default ID. Setting it explicitly can break the crypto functions.
 *
 * The profile function extracts user data and the flow parameter, which we use
 * in the createOrUpdateUser callback to differentiate sign-in from sign-up.
 */
const CustomPasswordProvider = Password<DataModel>({
  profile(params) {
    return {
      email: params.email as string,
      name: params.name as string || (params.email as string).split("@")[0],
      // Pass the flow parameter so we can access it in createOrUpdateUser callback
      // This helps us reject sign-in attempts for non-existent accounts
      _flow: params.flow as string | undefined,
    };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [CustomPasswordProvider],
  callbacks: {
    /**
     * Control user creation and login based on flow type.
     *
     * Flow logic:
     * - signIn + user exists → allow (return existingUserId)
     * - signIn + user doesn't exist → reject (account not found)
     * - signUp + user exists → reject (account already exists)
     * - signUp + user doesn't exist → create user
     */
    async createOrUpdateUser(ctx, args) {
      // Access the flow from the profile (passed from frontend via _flow)
      const profile = args.profile as { email?: string; name?: string; image?: string; _flow?: string };
      const flow = profile?._flow;

      // If user already exists
      if (args.existingUserId) {
        // On sign-up flow with existing account, reject - user should sign in instead
        if (flow === "signUp") {
          throw new ConvexError("An account with this email already exists. Please sign in instead.");
        }
        // Sign-in flow with existing user - allow login
        return args.existingUserId;
      }

      // User doesn't exist - check flow
      // If it's explicitly a sign-in flow and user doesn't exist, reject
      if (flow === "signIn") {
        throw new ConvexError("Account not found. Please sign up first or check your credentials.");
      }

      // Sign-up flow: Create the user (don't store _flow in the database)
      return ctx.db.insert("users", {
        email: profile?.email,
        name: profile?.name,
        image: profile?.image,
      });
    },
  },
});