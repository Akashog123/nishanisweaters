/**
 * Convex Auth Configuration
 *
 * This file configures authentication providers for Convex.
 * For Clerk integration, we specify the Clerk domain.
 */

export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
