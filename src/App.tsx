import { useState } from "react";
import { Stopwatch } from "./components/Stopwatch";
import "./App.css";

function App() {
  const [title] = useState(import.meta.env.VITE_APP_NAME || "Timer App");
  const [description] = useState(
    import.meta.env.VITE_APP_TAGLINE || "Mobile Timer"
  );

  return (
    <>
      <header className="app-header">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <main>
        <Stopwatch />
      </main>
    </>
  );
}

export default App;
