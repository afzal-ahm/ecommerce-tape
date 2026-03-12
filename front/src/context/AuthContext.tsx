import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import axios from "axios";
import { Admin } from "@/types/admin";

// Auth context interface
interface AuthContextType {
  admin: Admin | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Ensure permissions is an array of strings
const normalizePermissions = (permissions: any): string[] => {
  if (!permissions) return [];
  if (!Array.isArray(permissions)) return [];

  // Filter out any non-string values
  return permissions.filter((perm) => typeof perm === "string");
};

// Create a provider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("adminToken")
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated
  const isAuthenticated = !!token && !!admin;

  // Effect to initialize admin data from token
  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try {
          // Set default authorization header
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

          // Fetch admin profile
          const response = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/admin/profile`
          );

          if (response.data.success) {
            const userData = response.data.data.admin;

            // Ensure permissions is always an array of strings
            const normalizedPermissions = normalizePermissions(
              userData.permissions
            );

            setAdmin({
              ...userData,
              permissions: normalizedPermissions,
            });
          } else {
            // If unable to fetch profile, clear token
            localStorage.removeItem("adminToken");
            setToken(null);
            delete axios.defaults.headers.common["Authorization"];
          }
        } catch (error) {
          console.error("Auth initialization error:", error);
          localStorage.removeItem("adminToken");
          setToken(null);
          delete axios.defaults.headers.common["Authorization"];
        }
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, [token]);

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/login`,
        {
          email,
          password,
        }
      );

      if (response.data.success) {
        const { token: authToken, admin: userData } = response.data.data;

        // Ensure permissions is always an array of strings
        const normalizedPermissions = normalizePermissions(
          userData.permissions
        );

        // Save token to localStorage
        localStorage.setItem("adminToken", authToken);

        // Set token in state and axios default headers
        setToken(authToken);
        axios.defaults.headers.common["Authorization"] = `Bearer ${authToken}`;

        // Set admin data with normalized permissions
        setAdmin({
          ...userData,
          permissions: normalizedPermissions,
        });
      } else {
        setError(response.data.message || "Login failed");
      }
    } catch (error: any) {
      setError(
        error.response?.data?.message || "An error occurred during login"
      );
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem("adminToken");
    setToken(null);
    setAdmin(null);
    delete axios.defaults.headers.common["Authorization"];
  };

  // Context value
  const value = {
    admin,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
