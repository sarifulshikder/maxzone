"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { User, AuthData, ApiResponse } from "@/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const setCookie = (name: string, value: string, days: number = 7) => {
    if (typeof document === "undefined") return;
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  };

  const deleteCookie = (name: string) => {
    if (typeof document === "undefined") return;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  };

  const checkAuth = useCallback(async () => {
    if (typeof window === "undefined") return;
    const storedToken = localStorage.getItem("maxzone_access_token");
    const storedUser = localStorage.getItem("maxzone_user");

    if (!storedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    setToken(storedToken);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // ignore parse error
      }
    }

    try {
      const res = await api.get<ApiResponse<{ user: User }>>("/auth/me");
      if (res.data?.success && res.data.data?.user) {
        setUser(res.data.data.user);
        localStorage.setItem("maxzone_user", JSON.stringify(res.data.data.user));
        setCookie("maxzone_token", storedToken);
      }
    } catch {
      // If access token expired, attempt refresh
      const refreshToken = localStorage.getItem("maxzone_refresh_token");
      if (refreshToken) {
        try {
          const refreshRes = await api.post<ApiResponse<AuthData>>("/auth/refresh", {
            refresh_token: refreshToken,
          });
          if (refreshRes.data?.success && refreshRes.data.data) {
            const { token: newToken, refresh_token: newRefreshToken, user: refreshedUser } = refreshRes.data.data;
            localStorage.setItem("maxzone_access_token", newToken);
            localStorage.setItem("maxzone_refresh_token", newRefreshToken);
            localStorage.setItem("maxzone_user", JSON.stringify(refreshedUser));
            setCookie("maxzone_token", newToken);
            setToken(newToken);
            setUser(refreshedUser);
            setIsLoading(false);
            return;
          }
        } catch {
          // refresh failed
        }
      }

      // Cleanup if refresh also failed
      localStorage.removeItem("maxzone_access_token");
      localStorage.removeItem("maxzone_refresh_token");
      localStorage.removeItem("maxzone_user");
      deleteCookie("maxzone_token");
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.post<ApiResponse<AuthData>>("/auth/login", {
        username,
        password,
      });

      if (res.data?.success && res.data.data) {
        const { token: accessToken, refresh_token: refreshToken, user: authUser } = res.data.data;
        localStorage.setItem("maxzone_access_token", accessToken);
        localStorage.setItem("maxzone_refresh_token", refreshToken);
        localStorage.setItem("maxzone_user", JSON.stringify(authUser));
        setCookie("maxzone_token", accessToken);

        setToken(accessToken);
        setUser(authUser);

        return { success: true };
      }

      return {
        success: false,
        error: res.data?.error?.message || "Invalid username or password",
      };
    } catch (err: unknown) {
      let msg = "Invalid username or password";
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { status?: number; data?: { error?: { message?: string } } } };
        if (axiosErr.response?.data?.error?.message) {
          msg = axiosErr.response.data.error.message;
        } else if (axiosErr.response?.status === 403) {
          msg = "Access forbidden (403). Server rejected request origin.";
        } else if (axiosErr.response?.status === 500) {
          msg = "Server internal error (500). Please check backend logs.";
        }
      } else {
        msg = "Network connection error. Unable to reach backend service.";
      }
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    const refreshToken = typeof window !== "undefined" ? localStorage.getItem("maxzone_refresh_token") : null;
    try {
      if (refreshToken) {
        await api.post("/auth/logout", { refresh_token: refreshToken });
      } else {
        await api.post("/auth/logout");
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("maxzone_access_token");
        localStorage.removeItem("maxzone_refresh_token");
        localStorage.removeItem("maxzone_user");
        deleteCookie("maxzone_token");
      }
      setUser(null);
      setToken(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
