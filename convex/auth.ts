import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth, createAccount, retrieveAccount } from "@convex-dev/auth/server";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { ConvexError } from "convex/values";
import { DataModel } from "./_generated/dataModel";

/**
 * Custom Password provider that separates sign-in and sign-up flows.
 * - signIn: Only works for existing accounts (throws error if account doesn't exist)
 * - signUp: Creates new accounts
 */
const CustomPassword = ConvexCredentials<DataModel>({
  id: "password",
  authorize: async (params, ctx) => {
    const email = params.email as string;
    const password = params.password as string;
    const flow = params.flow as string;

    if (!email || !password) {
      throw new ConvexError("Email and password are required");
    }

    if (flow === "signUp") {
      // Sign-up flow: Create a new account
      try {
        const { user } = await createAccount(ctx, {
          provider: "password",
          account: {
            id: email,
            secret: password,
          },
          profile: {
            email: email,
          },
        });
        return { userId: user._id };
      } catch (error: any) {
        // Account might already exist
        if (error.message?.includes("already exists")) {
          throw new ConvexError("An account with this email already exists. Please sign in instead.");
        }
        throw error;
      }
    } else {
      // Sign-in flow: Only authenticate existing accounts
      const result = await retrieveAccount(ctx, {
        provider: "password",
        account: {
          id: email,
          secret: password,
        },
      });

      if (result === null) {
        throw new ConvexError("Account not found. Please sign up first or check your credentials.");
      }

      const { user } = result;
      return { userId: user._id };
    }
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [CustomPassword],
});