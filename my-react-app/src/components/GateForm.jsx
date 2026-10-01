import { useState } from 'react'
import { DONE_CODE, GATES, countInputs, findUnconnected } from '../logic/circuit.js'

const FIELD_LABELS = {
  1: ['Input index'],
  2: ['First input index', 'Second input index'],
}

export default function GateForm({ circuit, onAdd, onUndo, onDone }) {
  const [code, setCode] = useState(1)
  const [indices, setIndices] = useState(['', ''])

  const gate = GATES[code]
  const fields = indices.slice(0, gate.inputs)
  const n = countInputs(circuit)
  const unconnected = findUnconnected(circuit)
  const leftover = unconnected.filter((idx) => idx !== circuit.length - 1)
  const nextEmpty = fields.findIndex((value) => value.trim() === '')

  function setField(field, value) {
    setIndices((prev) => prev.map((old, i) => (i === field ? value : old)))
  }

  function submit(event) {
    event.preventDefault()
    onAdd(code, fields)
    setIndices(['', ''])
  }

  return (
    <>
      <form className="gate-form" onSubmit={submit}>
        <fieldset className="gate-types">
          <legend>What sort of gate do you want to add?</legend>
          {GATES.map((option) => (
            <label key={option.code} className="gate-type">
              <input
                type="radio"
                name="gate"
                value={option.code}
                checked={option.code === code}
                onChange={() => setCode(option.code)}
              />
              <span className="gate-code">{option.code}</span>
              <span className="gate-name">{option.name}</span>
            </label>
          ))}
        </fieldset>

        <div className="index-fields">
          {fields.map((value, field) => (
            <label key={field} className="field">
              <span>{FIELD_LABELS[gate.inputs][field]}</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={`0–${circuit.length - 1}`}
                value={value}
                onChange={(event) => setField(field, event.target.value)}
              />
            </label>
          ))}
        </div>

        <div className="available">
          <span className="available-label">Unconnected — click to use:</span>
          <div className="chips">
            {unconnected.map((idx) => (
              <button
                key={idx}
                type="button"
                className={`chip ${idx < n ? 'chip-pin' : 'chip-gate'}`}
                disabled={nextEmpty === -1 || fields.includes(String(idx))}
                onClick={() => setField(nextEmpty, String(idx))}
                title={idx < n ? `Input pin ${idx}` : `${circuit[idx].type} gate ${idx}`}
              >
                <b>{idx}</b>
                <span>{idx < n ? 'pin' : circuit[idx].type}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="button button-primary">
            Add {gate.name} as gate {circuit.length}
          </button>
          <button type="button" className="button" onClick={onUndo} disabled={circuit.length === n}>
            Undo last gate
          </button>
        </div>
      </form>

      <div className="finish">
        <p className={leftover.length === 0 && circuit.length > n ? 'finish-ready' : 'finish-hint'}>
          {circuit.length === n
            ? 'Add at least one gate before finishing.'
            : leftover.length === 0
              ? `Everything feeds into gate ${circuit.length - 1}, so it will be the output pin.`
              : `Still unconnected: ${leftover.join(', ')}. Choosing DONE now is BAD INPUT!`}
        </p>
        <button type="button" className="button button-done" onClick={onDone}>
          <span className="gate-code">{DONE_CODE}</span> DONE
        </button>
      </div>
    </>
  )
}
