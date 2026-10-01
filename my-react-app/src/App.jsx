import { useState } from 'react'
import CanvasMode from './canvas/CanvasMode.jsx'
import { circuitToFlow } from './canvas/flow.js'
import GuidedMode from './components/GuidedMode.jsx'
import './App.css'

const MODES = [
  { key: 'canvas', label: 'Canvas', hint: 'Drag, wire and simulate' },
  { key: 'guided', label: 'Step by step', hint: 'Same prompts as the console version' },
]

export default function App() {
  const [mode, setMode] = useState('canvas')
  // Loading an example, clearing, or opening a step-by-step circuit replaces
  // the whole canvas, which remounts it with the new starting point.
  const [canvas, setCanvas] = useState({ version: 0, seed: null })
  const replaceCanvas = (seed) => setCanvas((current) => ({ version: current.version + 1, seed }))

  return (
    <div className="app">
      <header className="masthead">
        <h1>Gates of Babylon</h1>
        <p className="tagline">
          “I think you’re ready to see… the Gates of Babylon!” <span>— Dio</span>
        </p>
      </header>

      <nav className="mode-tabs" role="tablist" aria-label="Mode">
        {MODES.map((option) => (
          <button
            key={option.key}
            type="button"
            role="tab"
            id={`mode-tab-${option.key}`}
            aria-selected={mode === option.key}
            aria-controls={`mode-${option.key}`}
            className="mode-tab"
            onClick={() => setMode(option.key)}
          >
            <b>{option.label}</b>
            <span>{option.hint}</span>
          </button>
        ))}
      </nav>

      {/* Both modes stay mounted so switching tabs keeps their work. */}
      <main>
        <div id="mode-canvas" role="tabpanel" aria-labelledby="mode-tab-canvas" hidden={mode !== 'canvas'}>
          <CanvasMode key={canvas.version} seed={canvas.seed} onReplace={replaceCanvas} />
        </div>
        <div id="mode-guided" role="tabpanel" aria-labelledby="mode-tab-guided" hidden={mode !== 'guided'}>
          <GuidedMode
            onOpenInCanvas={(circuit) => {
              replaceCanvas(circuitToFlow(circuit))
              setMode('canvas')
            }}
          />
        </div>
      </main>
    </div>
  )
}
