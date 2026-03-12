"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Mail, Lock, User, Phone, ArrowRight, Eye, EyeOff, Loader2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import Image from "next/image";

function AuthForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { isAuthenticated } = useAuth();

    const tabFromUrl = searchParams.get("tab") || "login";
    const [activeTab, setActiveTab] = useState(tabFromUrl);

    useEffect(() => {
        setActiveTab(tabFromUrl);
    }, [tabFromUrl]);

    useEffect(() => {
        if (isAuthenticated) {
            router.push("/");
        }
    }, [isAuthenticated, router]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        router.push(`/auth?tab=${tab}`, { scroll: false });
    };

    return (
        <div className="min-h-screen bg-gradient-section flex items-center justify-center py-8 px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block">
                        <Image src="/logo.png" alt="D-Fix Kart" width={140} height={50} className="h-12 w-auto mx-auto" />
                    </Link>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-100">
                        <button
                            onClick={() => handleTabChange("login")}
                            className={`flex-1 py-4 text-center font-semibold text-sm transition-all ${activeTab === "login"
                                ? "text-primary border-b-2 border-primary bg-primary/5"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => handleTabChange("register")}
                            className={`flex-1 py-4 text-center font-semibold text-sm transition-all ${activeTab === "register"
                                ? "text-primary border-b-2 border-primary bg-primary/5"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            Create Account
                        </button>
                    </div>

                    <div className="p-6 md:p-8">
                        {activeTab === "login" && <LoginForm />}
                        {activeTab === "register" && <RegisterForm />}
                    </div>
                </div>

                {/* Bottom Link */}
                <p className="text-center text-sm text-gray-500 mt-6">
                    <Link href="/" className="text-primary hover:underline font-medium">
                        ← Back to Shopping
                    </Link>
                </p>
            </div>
        </div>
    );
}

function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error("Email and password are required");
            return;
        }

        setIsSubmitting(true);

        try {
            await login(email, password);
            sessionStorage.setItem("justLoggedIn", "true");
            toast.success("Welcome back!");

            const returnUrl = searchParams.get("returnUrl") || searchParams.get("redirect");
            setTimeout(() => {
                router.push(returnUrl ? decodeURIComponent(returnUrl) : "/");
            }, 300);
        } catch (error) {
            const errorMessage = error.message || "Login failed. Please check your credentials.";
            if (errorMessage.toLowerCase().includes("verify")) {
                toast.error(
                    <div>
                        {errorMessage}{" "}
                        <Link href="/resend-verification" className="underline font-medium">
                            Resend verification
                        </Link>
                    </div>
                );
            } else {
                toast.error(errorMessage);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center mb-6">
                <h1 className="text-2xl font-display font-bold text-gray-900">Welcome Back</h1>
                <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        className="input-premium pl-11"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="input-premium pl-11 pr-11"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            <div className="text-right">
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                </Link>
            </div>

            <Button type="submit" className="w-full btn-primary h-12 text-base gap-2" disabled={isSubmitting}>
                {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
                ) : (
                    <>Sign In <ArrowRight className="h-4 w-4" /></>
                )}
            </Button>
        </form>
    );
}

function RegisterForm() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register } = useAuth();
    const router = useRouter();

    // Password validation checks
    const passwordChecks = {
        minLength: formData.password.length >= 8,
        hasLetter: /[a-zA-Z]/.test(formData.password),
        hasNumber: /[0-9]/.test(formData.password),
        hasSymbol: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~;']/.test(formData.password),
    };

    const allPasswordRequirementsMet = Object.values(passwordChecks).every(Boolean);
    const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const validateForm = () => {
        if (formData.name.trim().length < 3) {
            toast.error("Name should be at least 3 characters");
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            toast.error("Please enter a valid email address");
            return false;
        }

        if (!allPasswordRequirementsMet) {
            toast.error("Password doesn't meet all requirements");
            return false;
        }

        if (!passwordsMatch) {
            toast.error("Passwords do not match");
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);

        try {
            await register({
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
            });

            toast.success("Account created! Please verify your email.");
            localStorage.setItem("registeredEmail", formData.email);

            setTimeout(() => {
                router.push(`/verify-otp?email=${encodeURIComponent(formData.email)}`);
            }, 600);
        } catch (error) {
            toast.error(error.message || "Registration failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Password requirement item component
    const PasswordRequirement = ({ met, text }) => (
        <div className={`flex items-center gap-2 text-xs ${met ? 'text-green-600' : 'text-red-500'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] ${met ? 'bg-green-500' : 'bg-red-400'}`}>
                {met ? '✓' : '✗'}
            </span>
            <span>{text}</span>
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center mb-6">
                <h1 className="text-2xl font-display font-bold text-gray-900">Create Account</h1>
                <p className="text-gray-500 text-sm mt-1">Join D-Fix Kart today</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="Your full name"
                        className="input-premium pl-11"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="you@example.com"
                        className="input-premium pl-11"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone (Optional)</label>
                <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+91 9876543210"
                        className="input-premium pl-11"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        placeholder="Create a strong password"
                        className="input-premium pl-11 pr-11"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                
                {/* Password Requirements Checklist */}
                {formData.password.length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                        <p className="text-xs font-medium text-gray-600 mb-2">Password Requirements:</p>
                        <PasswordRequirement met={passwordChecks.minLength} text="At least 8 characters" />
                        <PasswordRequirement met={passwordChecks.hasLetter} text="At least one letter (a-z, A-Z)" />
                        <PasswordRequirement met={passwordChecks.hasNumber} text="At least one number (0-9)" />
                        <PasswordRequirement met={passwordChecks.hasSymbol} text="At least one symbol (!@#$%^&*)" />
                    </div>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type={showPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        placeholder="Confirm password"
                        className={`input-premium pl-11 ${formData.confirmPassword.length > 0 ? (passwordsMatch ? 'border-green-500 focus:ring-green-500' : 'border-red-500 focus:ring-red-500') : ''}`}
                    />
                </div>
                {formData.confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
                {formData.confirmPassword.length > 0 && passwordsMatch && (
                    <p className="text-xs text-green-600 mt-1">Passwords match ✓</p>
                )}
            </div>

            <Button 
                type="submit" 
                className="w-full btn-primary h-12 text-base gap-2" 
                disabled={isSubmitting || !allPasswordRequirementsMet || !passwordsMatch}
            >
                {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</>
                ) : (
                    <>Create Account <ArrowRight className="h-4 w-4" /></>
                )}
            </Button>
        </form>
    );
}

export default function AuthPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-section">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <AuthForm />
        </Suspense>
    );
}
