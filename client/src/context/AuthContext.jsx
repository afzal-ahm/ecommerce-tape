"use client";

import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem("dj-challenger-user");
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                console.error("Error loading user:", e);
            }
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (user) {
            localStorage.setItem("dj-challenger-user", JSON.stringify(user));
        } else {
            localStorage.removeItem("dj-challenger-user");
        }
    }, [user]);

    const login = async (email, password) => {
        // Mock login - in production, call API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockUser = {
            id: "user_" + Date.now(),
            email,
            name: email.split("@")[0],
            createdAt: new Date().toISOString(),
        };
        setUser(mockUser);
        return { success: true, user: mockUser };
    };

    const register = async (name, email, phone) => {
        // Mock register - in production, call API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockUser = {
            id: "user_" + Date.now(),
            email,
            name,
            phone,
            createdAt: new Date().toISOString(),
        };
        setUser(mockUser);
        return { success: true, user: mockUser };
    };

    const verifyOTP = async (otp) => {
        // Mock OTP verification
        await new Promise(resolve => setTimeout(resolve, 500));
        return otp === "123456" || otp.length === 6;
    };

    const sendOTP = async (phone) => {
        // Mock send OTP
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true, message: "OTP sent to " + phone };
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isLoggedIn: !!user,
                login,
                register,
                verifyOTP,
                sendOTP,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
