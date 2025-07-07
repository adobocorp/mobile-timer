import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Dialog } from "@capacitor/dialog";
import "./Login.css";

export const Login: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleGoogleLogin = async () => {
    setIsLoading(true);

    try {
      // For demo purposes, we'll simulate a Google login by using the demo account
      // In a real app, this would integrate with Google OAuth
      await Dialog.alert({
        title: "Google Login Demo",
        message: "This is a demo app. We'll log you in with the demo account.",
        buttonTitle: "Continue",
      });

      // Simulate Google login by logging in with demo credentials
      const success = await login("demo", "demo123");

      if (!success) {
        await Dialog.alert({
          title: "Login Failed",
          message: "Demo login failed. Please try again.",
          buttonTitle: "OK",
        });
      }
    } catch (error) {
      console.error("Google login error:", error);
      await Dialog.alert({
        title: "Login Error",
        message: "An error occurred during login. Please try again.",
        buttonTitle: "OK",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <button
          className={`google-login-btn ${isLoading ? "loading" : ""}`}
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="loading-spinner">⏳</span>
          ) : (
            <>
              <span className="google-icon">🔍</span>
              Login with Adobo Network
            </>
          )}
        </button>
        <div className="app-info">
          <p>💡Tip: Signing in allows for more features.</p>
        </div>
      </div>
    </div>
  );
};
