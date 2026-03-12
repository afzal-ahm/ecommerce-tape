import { useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const API_URL = import.meta.env.VITE_API_URL;

export default function PartnerLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Password change dialog
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
    const [passwordChangeError, setPasswordChangeError] = useState("");

    // Forgot password
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotError, setForgotError] = useState("");
    const [forgotSuccess, setForgotSuccess] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await axios.post(`${API_URL}/api/partner/auth/login`, {
                email,
                password
            });

            const { partner, token, requiresPasswordChange } = response.data.data;

            // Store token and partner data
            localStorage.setItem('partnerToken', token);
            localStorage.setItem('partnerData', JSON.stringify(partner));

            if (requiresPasswordChange) {
                setCurrentPassword(password);
                setShowPasswordChange(true);
            } else {
                // Redirect to partner dashboard
                window.location.href = '/partner-dashboard';
            }
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || "Login failed");
            } else {
                setError("Login failed");
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setPasswordChangeError("Passwords do not match");
            return;
        }

        if (newPassword.length < 6) {
            setPasswordChangeError("Password must be at least 6 characters");
            return;
        }

        setPasswordChangeLoading(true);
        setPasswordChangeError("");

        try {
            const token = localStorage.getItem('partnerToken');
            await axios.post(`${API_URL}/api/partner/auth/change-password`, {
                currentPassword,
                newPassword
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setShowPasswordChange(false);
            alert("Password changed successfully!");
            window.location.href = '/partner-dashboard';
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setPasswordChangeError(err.response?.data?.message || "Failed to change password");
            } else {
                setPasswordChangeError("Failed to change password");
            }
        } finally {
            setPasswordChangeLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotLoading(true);
        setForgotError("");
        setForgotSuccess("");

        try {
            await axios.post(`${API_URL}/api/partner/auth/forgot-password`, {
                email: forgotEmail
            });
            setForgotSuccess("If your email is registered, you'll receive reset instructions.");
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setForgotError(err.response?.data?.message || "Failed to send reset email");
            } else {
                setForgotError("Failed to send reset email");
            }
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-center">Partner Login</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Logging in..." : "Login"}
                        </Button>

                        <Button
                            type="button"
                            variant="link"
                            className="w-full"
                            onClick={() => setShowForgotPassword(true)}
                        >
                            Forgot Password?
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Password Change Dialog */}
            <Dialog open={showPasswordChange} onOpenChange={setShowPasswordChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Your Password</DialogTitle>
                        <DialogDescription>
                            You're using the demo password. Please set your own password for security.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        {passwordChangeError && (
                            <Alert variant="destructive">
                                <AlertDescription>{passwordChangeError}</AlertDescription>
                            </Alert>
                        )}

                        <div>
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Minimum 6 characters"
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={passwordChangeLoading}>
                                {passwordChangeLoading ? "Changing..." : "Change Password"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Forgot Password Dialog */}
            <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            Enter your email address and we'll send you reset instructions.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleForgotPassword} className="space-y-4">
                        {forgotError && (
                            <Alert variant="destructive">
                                <AlertDescription>{forgotError}</AlertDescription>
                            </Alert>
                        )}

                        {forgotSuccess && (
                            <Alert>
                                <AlertDescription>{forgotSuccess}</AlertDescription>
                            </Alert>
                        )}

                        <div>
                            <Label htmlFor="forgotEmail">Email</Label>
                            <Input
                                id="forgotEmail"
                                type="email"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                required
                            />
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={forgotLoading}>
                                {forgotLoading ? "Sending..." : "Send Reset Link"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
