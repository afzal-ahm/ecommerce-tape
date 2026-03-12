import { NextResponse } from "next/server";

// Define private routes that require authentication
const privateRoutes = ["/profile", "/checkout", "/wishlist", "/orders"];

// Define auth routes that should redirect to dashboard if already logged in
const authRoutes = [
    "/auth",
    "/auth",
    "/verify-email",
    "/resend-verification",
    "/forgot-password",
    "/reset-password",
];

export function middleware(request) {
    const { pathname } = request.nextUrl;

    // Get the authentication cookie
    const isAuthenticated =
        request.cookies.has("accessToken") || request.cookies.has("user_session");

    // Check if the path is a private route
    const isPrivateRoute = privateRoutes.some((route) =>
        pathname.startsWith(route)
    );

    // Check if the path is an auth route (login, register, etc.)
    const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

    // If accessing a private route without authentication, redirect to login
    if (isPrivateRoute && !isAuthenticated) {
        return NextResponse.redirect(new URL("/auth", request.url));
    }

    // If accessing an auth route while already authenticated, redirect to account dashboard
    if (isAuthRoute && isAuthenticated && !pathname.includes("verify-email")) {
        return NextResponse.redirect(new URL("/profile", request.url));
    }

    return NextResponse.next();
}

// Configure the paths that middleware should run on
export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - images/ (app's images)
         * - public/ (public files)
         * - api/ (API routes)
         */
        "/((?!_next/static|_next/image|favicon.ico|images|public|api).*)",
    ],
};
