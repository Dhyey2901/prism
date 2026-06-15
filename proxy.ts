import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Only the save/load routes require auth.
// /api/analyze (the AI call) stays public so anonymous users can still analyse.
const isProtectedRoute = createRouteMatcher(["/api/analyses(.*)"]);

export const proxy = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
