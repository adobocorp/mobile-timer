import { useState } from "react";
import { Stopwatch } from "./components/Stopwatch";
import "./App.css";

function App() {
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
}

export default App;
