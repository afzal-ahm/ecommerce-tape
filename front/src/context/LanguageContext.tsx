import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import en from "../translations/en.json";
import hi from "../translations/hi.json";
import es from "../translations/es.json";
import fr from "../translations/fr.json";
import de from "../translations/de.json";
import zh from "../translations/zh.json";
import ja from "../translations/ja.json";
import ar from "../translations/ar.json";

// Define the shape of our translations
// We can use the 'en' file as the source of truth for types, or simpler generic types


type Language = "en" | "hi" | "es" | "fr" | "de" | "zh" | "ja" | "ar";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
    dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Map of translations
const translations: Record<string, any> = {
    en,
    hi,
    es,
    fr,
    de,
    zh,
    ja,
    ar,
};

export function LanguageProvider({ children }: { children: ReactNode }) {
    const { admin, isAuthenticated, token } = useAuth();

    // Initialize from localStorage or default to 'en'
    const [language, setLanguageState] = useState<Language>(() => {
        const saved = localStorage.getItem("adminLanguage");
        return (saved as Language) || "en";
    });

    // Sync with backend when admin is loaded
    useEffect(() => {
        if (isAuthenticated && admin?.language) {
            const adminLang = admin.language as Language;
            // Only update if different to avoid potential loops, 
            // though React state updates are cheap if value is same.
            if (adminLang !== language) {
                setLanguageState(adminLang);
                localStorage.setItem("adminLanguage", adminLang);
            }
        }
    }, [isAuthenticated, admin]);

    const setLanguage = async (lang: Language) => {
        // optimistically update state and local storage
        setLanguageState(lang);
        localStorage.setItem("adminLanguage", lang);

        // If logged in, persist to backend
        if (isAuthenticated && token) {
            try {
                await axios.patch(
                    `${import.meta.env.VITE_API_URL}/api/admin/profile`,
                    { language: lang },
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );
            } catch (error) {
                console.error("Failed to persist language preference:", error);
                // We don't revert state here to allow offline/optimistic UI
            }
        }
    };

    // Helper to access nested keys like "nav.dashboard"
    const t = (path: string, params?: Record<string, string | number>): string => {
        const keys = path.split(".");
        let current: any = translations[language];
        let result = path;

        for (const key of keys) {
            if (current && current[key] !== undefined) {
                current = current[key];
            } else {
                // Fallback to English if key missing in selected language
                let fallback: any = translations["en"];
                let foundFallback = true;
                for (const fbKey of keys) {
                    if (fallback && fallback[fbKey] !== undefined) {
                        fallback = fallback[fbKey];
                    } else {
                        foundFallback = false;
                        break;
                    }
                }
                if (foundFallback && typeof fallback === 'string') {
                    current = fallback;
                    break;
                }
                return path; // Return key if not found anywhere
            }
        }

        if (typeof current === 'string') {
            result = current;
        } else {
            return path;
        }

        // Handle interpolation
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                result = result.replace(new RegExp(`{${key}}`, 'g'), String(value));
            });
        }

        return result;
    };

    const dir = language === "ar" ? "rtl" : "ltr";

    useEffect(() => {
        document.documentElement.dir = dir;
        document.documentElement.lang = language;
    }, [dir, language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}
