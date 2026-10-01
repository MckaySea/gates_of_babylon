import { useEffect, useRef, useState } from 'react'
import { formatTruthTable } from '../logic/circuit.js'
import { bitText, stateClass } from './simulation.js'

const TABS = [
  ['table', 'Truth table'],
  ['parts', 'Components'],
  ['block', 'Circuit block'],
]

// Side panel for the canvas: what's left to finish, the input switches, and
// the truth table, each component's live value, and the printable circuit
// block.
//   pins: [{ id, number, on }]          output: the output's value
//   parts: rows for the components tab  problems: from findProblems()
//   rows: truth table rows, or null     circuitBlock: lines, or null
export default function AnalysisPanel({ pins, output, parts, problems, rows, circuitBlock, onToggle, onSetPins }) {
  const [tab, setTab] = useState('table')
  const pinStates = pins.map((pin) => (pin.on ? 1 : 0))

  return (
    <aside className="analysis" aria-label="Simulation">
      <section className="card">
        {problems.length === 0 ? (
          <p className="status-ok">Valid logic block. Ready to print.</p>
        ) : (
          <>
            <h3>To finish the logic block</h3>
            <ul className="problems">
              {problems.slice(0, 5).map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
            {problems.length > 5 && <p className="hint">…and {problems.length - 5} more.</p>}
          </>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h3>Inputs</h3>
          <span className="output-readout">
            Output <span className={`readout-lamp ${stateClass(output)}`} aria-hidden="true" />
            <b>{bitText(output)}</b>
          </span>
        </div>
        {pins.length === 0 ? (
          <p className="hint">Add an input pin to the canvas.</p>
        ) : (
          <div className="pin-toggles">
            {pins.map((pin) => (
              <button
                key={pin.id}
                type="button"
                role="switch"
                aria-checked={pin.on}
                className={`pin-toggle ${stateClass(pin.on)}`}
                onClick={() => onToggle(pin.id)}
              >
                <span>Pin {pin.number}</span>
                <b>{pin.on ? 1 : 0}</b>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="card card-tabs">
        <div className="tabs" role="tablist" aria-label="Results">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`tab-${key}`}
              aria-selected={tab === key}
              aria-controls="results-panel"
              className="tab"
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div id="results-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="tab-panel">
          {tab === 'table' &&
            (rows ? (
              <TruthTable rows={rows} pinStates={pinStates} onSetPins={onSetPins} />
            ) : (
              <p className="hint">Wire the output, and every gate on the way to it, to see the truth table.</p>
            ))}
          {tab === 'parts' && <PartsTable parts={parts} />}
          {tab === 'block' &&
            (circuitBlock ? (
              <>
                <pre className="block-text">{circuitBlock.join('\n')}</pre>
                <CopyButton text={circuitBlock.join('\n')} />
              </>
            ) : (
              <p className="hint">
                The circuit block prints once the drawing is a valid logic block. See the list at the top.
              </p>
            ))}
        </div>
      </section>
    </aside>
  )
}

function TruthTable({ rows, pinStates, onSetPins }) {
  const scrollRef = useRef(null)
  const current = rows.findIndex((row) => row.inputs.every((bit, i) => bit === pinStates[i]))
  const ones = rows.filter((row) => row.output).length

  // Keep the row for the current switches in view, without scrolling the page.
  useEffect(() => {
    const box = scrollRef.current
    const row = box?.querySelector('.is-current')
    if (!row) return
    const head = box.querySelector('thead').offsetHeight
    if (row.offsetTop < box.scrollTop + head || row.offsetTop + row.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = row.offsetTop - head - (box.clientHeight - head) / 2
    }
  }, [current])

  return (
    <>
      <p className="hint">
        Output is 1 in {ones} of {rows.length} rows. Click a row to set the switches.
      </p>
      <div className="truth-scroll" ref={scrollRef}>
        <table className="truth-table">
          <thead>
            <tr>
              {pinStates.map((_, i) => (
                <th key={i} scope="col">
                  {i}
                </th>
              ))}
              <th scope="col" className="out-col">
                O
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr
                key={r}
                className={r === current ? 'is-current' : undefined}
                tabIndex={0}
                aria-current={r === current ? 'true' : undefined}
                onClick={() => onSetPins(row.inputs)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSetPins(row.inputs)
                  }
                }}
              >
                {row.inputs.map((bit, i) => (
                  <td key={i} className={`bit-${bit}`}>
                    {bit}
                  </td>
                ))}
                <td className={`out-col bit-${row.output}`}>{row.output}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CopyButton text={formatTruthTable(pinStates.length, rows).join('\n')} label="Copy in README format" />
    </>
  )
}

function PartsTable({ parts }) {
  if (parts.length === 0) return <p className="hint">Nothing on the canvas yet.</p>
  return (
    <div className="parts-scroll">
      <table className="parts-table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Part</th>
            <th scope="col">Inputs from</th>
            <th scope="col">Feeds</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((part) => (
            <tr key={part.id}>
              <td className="num">{part.index}</td>
              <td>{part.type}</td>
              <td className="num">{part.inputs}</td>
              <td className="num">{part.feeds}</td>
              <td>
                <span className={`value-chip ${stateClass(part.value)}`}>{bitText(part.value)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${text}\n`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be blocked; the text is still selectable.
    }
  }

  return (
    <button type="button" className="button button-small" onClick={copy}>
      {copied ? 'Copied' : label}
    </button>
  )
}
