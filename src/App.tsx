import { useState } from "react";
import { Stopwatch } from "./components/Stopwatch";
import { AuthProvider } from "./contexts/AuthContext";
import "./App.css";

// Main App Content component (needs to be inside AuthProvider)
const AppContent = () => {
  const [description] = useState(
    import.meta.env.VITE_APP_TAGLINE || "Session Timer"
  );

  return (
    <>
      <header className="app-header">
        <p>{description}</p>
      </header>
      <main>
        <Stopwatch />
      </main>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
