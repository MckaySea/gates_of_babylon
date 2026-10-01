import { useMemo, useReducer, useState } from 'react'
import Console from './components/Console.jsx'
import GateForm from './components/GateForm.jsx'
import Schematic from './components/Schematic.jsx'
import {
  BadInputError,
  MAX_INPUTS,
  MIN_INPUTS,
  addGate,
  countInputs,
  createCircuit,
  finishCircuit,
} from './logic/circuit.js'
import { EXAMPLES, buildExample } from './logic/examples.js'
import { PROMPTS, transcript } from './logic/transcript.js'
import './App.css'

// phase: 'setup' -> 'build' -> 'done', or 'bad' after any BAD INPUT!
// view: which output was picked once done (1 = circuit block, 2 = truth table)
const initialState = { phase: 'setup', circuit: [], view: null, failure: null }

function reducer(state, action) {
  try {
    switch (action.type) {
      case 'start':
        return { ...initialState, phase: 'build', circuit: createCircuit(action.count) }
      case 'example':
        return { ...initialState, phase: 'build', circuit: buildExample(action.example) }
      case 'add':
        return { ...state, circuit: addGate(state.circuit, action.code, action.indices) }
      case 'undo':
        return countInputs(state.circuit) < state.circuit.length
          ? { ...state, circuit: state.circuit.slice(0, -1) }
          : state
      case 'done':
        return { ...state, phase: 'done', circuit: finishCircuit(state.circuit) }
      case 'show':
        return { ...state, view: action.view }
      case 'reset':
        return initialState
      default:
        throw new Error(`Unknown action ${action.type}`)
    }
  } catch (error) {
    // Like the console version, bad input ends the session.
    if (!(error instanceof BadInputError)) throw error
    return { ...state, phase: 'bad', failure: { ...action, reason: error.reason, field: error.field } }
  }
}

const STEPS = [
  { phase: 'setup', label: 'Inputs' },
  { phase: 'build', label: 'Gates' },
  { phase: 'done', label: 'Output' },
]

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { phase, circuit, view, failure } = state
  const lines = useMemo(() => transcript(state), [state])
  const n = countInputs(circuit)
  const waiting = phase === 'setup' || phase === 'build' || (phase === 'done' && view === null)
  const stepPhase = phase === 'bad' ? failureStep(failure) : phase

  return (
    <div className="app">
      <header className="masthead">
        <h1>Gates of Babylon</h1>
        <p className="tagline">
          “I think you’re ready to see… the Gates of Babylon!” <span>— Dio</span>
        </p>
      </header>

      <main className="workspace">
        <section className="panel controls" aria-labelledby="controls-title">
          <ol className="steps">
            {STEPS.map((step, i) => (
              <li
                key={step.phase}
                className={step.phase === stepPhase ? 'step step-current' : 'step'}
                aria-current={step.phase === stepPhase ? 'step' : undefined}
              >
                <span className="step-number">{i + 1}</span>
                {step.label}
              </li>
            ))}
          </ol>

          {phase === 'setup' && (
            <SetupStep
              onStart={(count) => dispatch({ type: 'start', count })}
              onExample={(example) => dispatch({ type: 'example', example })}
            />
          )}

          {phase === 'build' && (
            <>
              <h2 id="controls-title">Build your logic block</h2>
              <p className="lede">
                {n} input {n === 1 ? 'pin' : 'pins'} (0{n > 1 ? `–${n - 1}` : ''}). Each new gate gets the
                next index, and every pin and gate must feed exactly one gate.
              </p>
              <GateForm
                circuit={circuit}
                onAdd={(code, indices) => dispatch({ type: 'add', code, indices })}
                onUndo={() => dispatch({ type: 'undo' })}
                onDone={() => dispatch({ type: 'done' })}
              />
            </>
          )}

          {phase === 'done' && (
            <>
              <h2 id="controls-title">Circuit complete</h2>
              <p className="lede">
                {circuit.length - n} {circuit.length - n === 1 ? 'gate' : 'gates'} on {n}{' '}
                {n === 1 ? 'input' : 'inputs'}. Gate {circuit.length - 1} drives the output pin.
              </p>
              <fieldset className="output-choice">
                <legend>{PROMPTS.output}</legend>
                {[
                  [1, 'Print Circuit Block'],
                  [2, 'Print Truth Table'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={view === value ? 'button button-primary' : 'button'}
                    aria-pressed={view === value}
                    onClick={() => dispatch({ type: 'show', view: value })}
                  >
                    <span className="gate-code">{value}</span> {label}
                  </button>
                ))}
              </fieldset>
              <p className="hint">The output prints in the console, in the same format as the C++ version.</p>
              <button type="button" className="button button-quiet" onClick={() => dispatch({ type: 'reset' })}>
                Build a new circuit
              </button>
            </>
          )}

          {phase === 'bad' && (
            <div className="bad-input" role="alert">
              <h2 id="controls-title">BAD INPUT!</h2>
              <p>{failure.reason}</p>
              <p className="hint">Like the console program, the session ends here.</p>
              <button type="button" className="button button-primary" onClick={() => dispatch({ type: 'reset' })}>
                Start over
              </button>
            </div>
          )}
        </section>

        <section className="panel schematic-panel" aria-labelledby="schematic-title">
          <div className="panel-head">
            <h2 id="schematic-title">Schematic</h2>
            <ul className="legend" aria-label="Legend">
              <li>
                <i className="swatch swatch-pin" /> input pin
              </li>
              <li>
                <i className="swatch swatch-gate" /> gate index
              </li>
            </ul>
          </div>
          <Schematic circuit={circuit} finished={phase === 'done'} />
        </section>

        <section className="panel console-panel" aria-label="Console">
          <Console lines={lines} waiting={waiting} />
        </section>
      </main>
    </div>
  )
}

function failureStep(failure) {
  if (failure.type === 'start') return 'setup'
  return failure.type === 'done' ? 'done' : 'build'
}

function SetupStep({ onStart, onExample }) {
  const [count, setCount] = useState('')

  return (
    <>
      <h2 id="controls-title">Start a logic block</h2>
      <p className="lede">
        A logic block takes N inputs and gives one output, which depends on the gates inside it.
      </p>
      <form
        className="count-form"
        onSubmit={(event) => {
          event.preventDefault()
          onStart(count)
        }}
      >
        <label htmlFor="input-count">{PROMPTS.count}</label>
        <div className="count-row">
          <input
            id="input-count"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder={`${MIN_INPUTS}–${MAX_INPUTS}`}
            value={count}
            onChange={(event) => setCount(event.target.value)}
          />
          <button type="submit" className="button button-primary">
            Start
          </button>
        </div>
      </form>

      <div className="examples">
        <p className="hint">Or load a sample run from the assignment README:</p>
        {EXAMPLES.map((example) => (
          <button key={example.name} type="button" className="example" onClick={() => onExample(example)}>
            <b>{example.name}</b>
            <span>{example.description}</span>
          </button>
        ))}
      </div>
    </>
  )
}
