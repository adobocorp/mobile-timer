import { useState } from 'react'
import { Stopwatch } from './components/Stopwatch'
import './App.css'

function App() {
  const [title] = useState('Mobile Timer');
  const [description] = useState('Precision stopwatch for mobile devices');
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
  )
}

export default App
