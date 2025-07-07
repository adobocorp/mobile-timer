import React from "react";
import "./Settings.css";
import { useAuth } from "../contexts/AuthContext";
import { Login } from "./Login";

export const Settings: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
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
          <h2 className="settings-title">Settings</h2>
          <div className="premium-features">
            <h3>Premium Features</h3>
            <div className="feature-list">
              <div className="feature-item">
                <span className="feature-icon">📋</span>
                <span className="feature-text">
                  Copy histogram reports to clipboard
                </span>
                <span className="feature-status enabled">✓ Enabled</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">💾</span>
                <span className="feature-text">Unlimited saved sessions</span>
                <span className="feature-status enabled">✓ Enabled</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">☁️</span>
                <span className="feature-text">Cloud sync across devices</span>
                <span className="feature-status enabled">✓ Enabled</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
