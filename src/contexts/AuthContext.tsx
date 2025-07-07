import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { Preferences } from "@capacitor/preferences";
import { Dialog } from "@capacitor/dialog";

interface User {
  id: string;
  username: string;
  email: string;
}

interface StoredUser {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on app load
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Initialize demo user if no users exist
      const { value: usersData } = await Preferences.get({
        key: "registeredUsers",
      });
      const users = usersData ? JSON.parse(usersData) : [];

      if (users.length === 0) {
        // Create demo user
        const demoUser = {
          id: "demo_user_001",
          username: "demo",
          email: "demo@example.com",
          password: "demo123",
          createdAt: new Date().toISOString(),
        };

        await Preferences.set({
          key: "registeredUsers",
          value: JSON.stringify([demoUser]),
        });
      }

      // Don't auto-login, just check if there's a valid session
      await checkAuthStatus();
    } catch (error) {
      console.error("Error initializing auth:", error);
      setIsLoading(false);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const { value: authToken } = await Preferences.get({ key: "authToken" });
      const { value: userData } = await Preferences.get({ key: "userData" });

      if (authToken && userData) {
        const parsedUser = JSON.parse(userData) as User;
        setUser(parsedUser);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      // Simulate API call - In a real app, you'd call your authentication server
      if (username.length < 3 || password.length < 6) {
        await Dialog.alert({
          title: "Login Failed",
          message:
            "Username must be at least 3 characters and password at least 6 characters.",
          buttonTitle: "OK",
        });
        return false;
      }

      // Check if user exists in "database" (Preferences storage)
      const { value: usersData } = await Preferences.get({
        key: "registeredUsers",
      });
      const users = usersData ? JSON.parse(usersData) : [];

      const foundUser = users.find(
        (u: StoredUser) => u.username === username && u.password === password
      );

      if (!foundUser) {
        await Dialog.alert({
          title: "Login Failed",
          message:
            "Invalid username or password. Please try again or register a new account.",
          buttonTitle: "OK",
        });
        return false;
      }

      // Create user session
      const user: User = {
        id: foundUser.id,
        username: foundUser.username,
        email: foundUser.email,
      };

      // Generate auth token (in real app, this would come from server)
      const authToken = `token_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Store auth data
      await Preferences.set({ key: "authToken", value: authToken });
      await Preferences.set({ key: "userData", value: JSON.stringify(user) });

      setUser(user);

      await Dialog.alert({
        title: "Welcome Back!",
        message: `Successfully logged in as ${username}.`,
        buttonTitle: "OK",
      });

      return true;
    } catch (error) {
      console.error("Login error:", error);
      await Dialog.alert({
        title: "Login Error",
        message: "An error occurred during login. Please try again.",
        buttonTitle: "OK",
      });
      return false;
    }
  };

  const register = async (
    username: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    try {
      // Validate input
      if (username.length < 3) {
        await Dialog.alert({
          title: "Registration Failed",
          message: "Username must be at least 3 characters long.",
          buttonTitle: "OK",
        });
        return false;
      }

      if (password.length < 6) {
        await Dialog.alert({
          title: "Registration Failed",
          message: "Password must be at least 6 characters long.",
          buttonTitle: "OK",
        });
        return false;
      }

      if (!email.includes("@")) {
        await Dialog.alert({
          title: "Registration Failed",
          message: "Please enter a valid email address.",
          buttonTitle: "OK",
        });
        return false;
      }

      // Check existing users
      const { value: usersData } = await Preferences.get({
        key: "registeredUsers",
      });
      const users = usersData ? JSON.parse(usersData) : [];

      // Check if username or email already exists
      const existingUser = users.find(
        (u: StoredUser) => u.username === username || u.email === email
      );

      if (existingUser) {
        await Dialog.alert({
          title: "Registration Failed",
          message:
            "Username or email already exists. Please choose different credentials.",
          buttonTitle: "OK",
        });
        return false;
      }

      // Create new user
      const newUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username,
        email,
        password, // In real app, this would be hashed
        createdAt: new Date().toISOString(),
      };

      // Save to "database"
      users.push(newUser);
      await Preferences.set({
        key: "registeredUsers",
        value: JSON.stringify(users),
      });

      await Dialog.alert({
        title: "Registration Successful",
        message: `Account created successfully! You can now log in with your credentials.`,
        buttonTitle: "OK",
      });

      return true;
    } catch (error) {
      console.error("Registration error:", error);
      await Dialog.alert({
        title: "Registration Error",
        message: "An error occurred during registration. Please try again.",
        buttonTitle: "OK",
      });
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Confirm logout
      const { value } = await Dialog.confirm({
        title: "Logout",
        message: "Are you sure you want to logout?",
        okButtonTitle: "Logout",
        cancelButtonTitle: "Cancel",
      });

      if (!value) return;

      // Clear auth data
      await Preferences.remove({ key: "authToken" });
      await Preferences.remove({ key: "userData" });

      setUser(null);

      await Dialog.alert({
        title: "Logged Out",
        message: "You have been successfully logged out.",
        buttonTitle: "OK",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
