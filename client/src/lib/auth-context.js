"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { fetchApi } from "./utils";

const AuthContext = createContext();

// Create a persistent verification token tracker using localStorage
const getVerifiedTokens = () => {
    if (typeof window === "undefined") return new Set();

    try {
        const tokens = JSON.parse(localStorage.getItem("verifiedTokens") || "[]");
        return new Set(tokens);
    } catch (e) {
        return new Set();
    }
};

const saveVerifiedToken = (token) => {
    if (typeof window === "undefined") return;

    try {
        const tokens = JSON.parse(localStorage.getItem("verifiedTokens") || "[]");
        if (!tokens.includes(token)) {
            tokens.push(token);
            localStorage.setItem("verifiedTokens", JSON.stringify(tokens));
        }
    } catch (e) {
        console.error("Failed to save verified token", e);
    }
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check if user is logged in on first load
    useEffect(() => {
        const checkAuth = async () => {
            try {
                // First try to read from cookies to avoid unnecessary API calls
                const userSessionCookie = document.cookie
                    .split("; ")
                    .find((row) => row.startsWith("user_session="));

                if (userSessionCookie) {
                    try {
                        // If we have a cookie, we're at least temporarily authenticated
                        // and can avoid a loading flash
                        const sessionData = JSON.parse(
                            decodeURIComponent(userSessionCookie.split("=")[1])
                        );
                        if (sessionData.isAuthenticated) {
                            // Make the API call to get full user data
                            const res = await fetchApi("/users/me", {
                                credentials: "include",
                            });
                            setUser(res.data.user);
                            setLoading(false);
                            return;
                        }
                    } catch (e) {
                        // If cookie parsing failed, continue to API call
                        console.error("Failed to parse user session cookie", e);
                    }
                }

                // No valid cookie found, attempt API call with credentials
                const res = await fetchApi("/users/me", {
                    credentials: "include",
                });
                setUser(res.data.user);
            } catch (err) {
                // API call failed, user is not authenticated
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    // Login function
    const login = async (email, password) => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetchApi("/users/login", {
                method: "POST",
                credentials: "include",
                body: JSON.stringify({ email, password }),
            });

            // Set user data from response
            setUser(res.data.user);

            // Save user session to cookie with 1 day expiration
            if (typeof window !== "undefined") {
                document.cookie = `user_session=${encodeURIComponent(
                    JSON.stringify({
                        isAuthenticated: true,
                        userId: res.data.user.id,
                        timestamp: new Date().getTime(),
                    })
                )}; path=/; max-age=86400`;
            }

            return res.data;
        } catch (err) {
            console.error("Login error:", err);

            // Extract the error message from the error object
            let errorMessage = "Failed to login. Please try again.";

            if (err.message) {
                errorMessage = err.message;
            } else if (err.data && err.data.message) {
                errorMessage = err.data.message;
            }

            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Register function
    const register = async (userData) => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetchApi("/users/register", {
                method: "POST",
                body: JSON.stringify(userData),
            });
            return res;
        } catch (err) {
            console.error("Registration error:", err);

            // Extract the error message from the error object
            let errorMessage = "Registration failed. Please try again.";

            if (err.message) {
                errorMessage = err.message;
            } else if (err.data && err.data.message) {
                errorMessage = err.data.message;
            }

            // Check for specific error types and provide friendly messages
            if (
                errorMessage.toLowerCase().includes("email already registered") ||
                errorMessage.toLowerCase().includes("already exists")
            ) {
                errorMessage =
                    "This email is already registered. Please try logging in instead.";
            } else if (errorMessage.toLowerCase().includes("password")) {
                errorMessage =
                    "Password doesn't meet requirements. Please use at least 8 characters with a mix of letters, numbers, and symbols.";
            }

            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Logout function
    const logout = async () => {
        setLoading(true);
        try {
            // First perform client-side logout regardless of API success
            setUser(null);

            // Manually clear cookies on the client side
            document.cookie =
                "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie =
                "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie =
                "user_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

            // Then attempt the API call
            await fetchApi("/users/logout", {
                method: "POST",
                credentials: "include",
            });
        } catch (err) {
            console.error(
                "Logout API call failed, but client-side logout completed",
                err
            );
            // Don't set error since we've already done client-side logout
        } finally {
            setLoading(false);
        }
    };

    // Verify email
    const verifyEmail = async (token) => {
        setLoading(true);
        setError(null);
        try {
            // Check if this token has already been attempted to be verified using the persistent storage
            const verifiedTokens = getVerifiedTokens();
            if (verifiedTokens.has(token)) {
                throw new Error("Verification already attempted for this token");
            }

            // Mark this token as attempted in persistent storage
            saveVerifiedToken(token);

            const res = await fetchApi(`/users/verify-email/${token}`, {
                method: "GET",
            });
            return res;
        } catch (err) {
            console.error("Email verification failed:", err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Resend verification email
    const resendVerification = async (email) => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetchApi("/users/resend-verification", {
                method: "POST",
                body: JSON.stringify({ email }),
            });

            return res;
        } catch (err) {
            console.error("Error resending verification email:", err);

            // Extract the error message from the error object
            let errorMessage =
                "Failed to resend verification email. Please try again.";

            if (err.message) {
                errorMessage = err.message;
            } else if (err.data && err.data.message) {
                errorMessage = err.data.message;
            }

            // Check for specific error cases
            if (errorMessage.toLowerCase().includes("already verified")) {
                errorMessage = "This email is already verified. Please try logging in.";
            } else if (
                errorMessage.toLowerCase().includes("not found") ||
                errorMessage.toLowerCase().includes("no user")
            ) {
                errorMessage =
                    "Email address not found. Please check your email or register a new account.";
            }

            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Verify OTP
    const verifyOtp = async (email, otp) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchApi("/users/verify-otp", {
                method: "POST",
                credentials: "include",
                body: JSON.stringify({ email, otp }),
            });

            // Auto-login logic: Check if response has user or token
            if (res.data?.user) {
                setUser(res.data.user);

                // Save session cookie
                if (typeof window !== "undefined") {
                    document.cookie = `user_session=${encodeURIComponent(
                        JSON.stringify({
                            isAuthenticated: true,
                            userId: res.data.user.id,
                            timestamp: new Date().getTime(),
                        })
                    )}; path=/; max-age=86400`;
                }
            } else {
                // If no user in response, try fetching /users/me in case a cookie was set by server
                try {
                    const userRes = await fetchApi("/users/me");
                    if (userRes.data?.user) {
                        setUser(userRes.data.user);
                        if (typeof window !== "undefined") {
                            document.cookie = `user_session=${encodeURIComponent(
                                JSON.stringify({
                                    isAuthenticated: true,
                                    userId: userRes.data.user.id,
                                    timestamp: new Date().getTime(),
                                })
                            )}; path=/; max-age=86400`;
                        }
                    }
                } catch (e) {
                    // Ignore - verification didn't log us in
                }
            }

            return res;
        } catch (err) {
            setError(err.message || "Failed to verify OTP");
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Forgot password
    const forgotPassword = async (email) => {
        setLoading(true);
        try {
            const res = await fetchApi("/users/forgot-password", {
                method: "POST",
                body: JSON.stringify({ email }),
            });
            return res;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Reset password
    const resetPassword = async (token, password) => {
        setLoading(true);
        try {
            const res = await fetchApi(`/users/reset-password/${token}`, {
                method: "POST",
                body: JSON.stringify({ password }),
            });
            return res;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Update profile
    const updateProfile = async (data) => {
        // IMPORTANT: don't toggle global `loading` here.
        // `loading` is used by `ProtectedRoute` as the auth-gating flag, and
        // setting it during profile updates causes the whole page to flash a
        // loading screen and can reset local UI state.
        setError(null);

        try {
            // Create the request data
            const formData = new FormData();
            formData.append("name", data.name);

            if (data.phone) {
                formData.append("phone", data.phone);
            }

            const res = await fetchApi("/users/update-profile", {
                method: "PATCH",
                credentials: "include",
                body: formData,
            });

            // Update the user data in state
            setUser(res.data.user);
            return res.data;
        } catch (err) {
            console.error("Profile update error:", err);
            setError(err.message || "Failed to update profile");
            throw err;
        }
    };

    // Compute isAuthenticated based on user state and loading state
    const isAuthenticated = !loading && !!user;

    const value = {
        user,
        loading,
        error,
        login,
        register,
        logout,
        verifyEmail,
        verifyOtp,
        resendVerification,
        forgotPassword,
        resetPassword,
        updateProfile,
        isAuthenticated,
        // Add helper methods
        isCustomer: user?.role === "CUSTOMER",
        userId: user?.id,
        userName: user?.name,
        userEmail: user?.email,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
