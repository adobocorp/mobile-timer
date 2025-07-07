import React from "react";
import "./Settings.css";
import { useAuth } from "../contexts/AuthContext";
import { Login } from "./Login";
import { Dialog } from "@capacitor/dialog";

export const Settings: React.FC = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();

  const handleLogout = async () => {
    try {
      const { value } = await Dialog.confirm({
        title: "Confirm Logout",
        message:
          "Are you sure you want to log out? You will need to sign in again to access extra features.",
        okButtonTitle: "Log Out",
        cancelButtonTitle: "Cancel",
      });

      if (value) {
        await logout();
      }
    } catch (error) {
      console.error("Logout confirmation error:", error);
      // Fallback to direct logout if dialog fails
      await logout();
    }
  };
  return (
    <div>
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner">⏳</div>
          <p>Loading...</p>
        </div>
      ) : !isAuthenticated ? (
        <>
          <Login />
        </>
      ) : (
        <div className="settings-container">
          <button className="logout-btn" onClick={handleLogout}>
            🚪 Log Out
          </button>
        </div>
      )}
    </div>
  );
};
