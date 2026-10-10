import { clerkMiddleware } from "@clerk/nextjs/server";

// Makes the Clerk session available to server code (auth(), currentUser()), including the
// /api route handlers. Route access is checked where the route lives, e.g.
// app/(admin)/layout.tsx and src/server/auth.ts.
export default clerkMiddleware({ signInUrl: "/login", signUpUrl: "/signup" });

export const config = {
  matcher: [
    // Skip Next internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
