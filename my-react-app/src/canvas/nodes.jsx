import { useContext } from 'react'
import { Handle, Position } from '@xyflow/react'
import { GATES } from '../logic/circuit.js'
import GateShape from './GateShape.jsx'
import { PORT_Y, portHandle } from './flow.js'
import { SimulationContext, bitText, stateClass } from './simulation.js'

// Custom React Flow nodes. Wires go from the handle on a part's right side
// ('out') into a handle on another part's left side ('in0' / 'in1').

export function PinNode({ id, data }) {
  const { indices, toggle } = useContext(SimulationContext)
  const on = Boolean(data.on)
  const label = `Pin ${indices.get(id)}`

  return (
    <div className={`part pin-node ${stateClass(on)}`}>
      <span className="part-label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`${label} switch`}
        className="nodrag pin-switch"
        onClick={() => toggle(id)}
      >
        <span className="pin-switch-knob" />
      </button>
      <span className="part-bit">{on ? 1 : 0}</span>
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  )
}

export function GateNode({ id, data }) {
  const { indices, sources, values } = useContext(SimulationContext)
  const value = values.get(id)
  const inputs = (sources.get(id) ?? []).map((source) => (source === undefined ? null : values.get(source)))
  const ports = PORT_Y[GATES.find((gate) => gate.name === data.gate).inputs]

  return (
    <div className={`part gate-node ${stateClass(value)}`}>
      <span className="gate-node-label">
        <b>{indices.get(id)}</b> {data.gate}
      </span>
      <GateShape type={data.gate} inputs={inputs} output={value} />
      <span className="gate-node-bit">{bitText(value)}</span>
      {ports.map((y, port) => (
        <Handle
          key={port}
          type="target"
          position={Position.Left}
          id={portHandle(port)}
          style={{ top: `${(y / 40) * 100}%` }}
        />
      ))}
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  )
}

export function OutputNode({ id }) {
  const { values } = useContext(SimulationContext)
  const value = values.get(id)

  return (
    <div className={`part output-node ${stateClass(value)}`}>
      <Handle type="target" position={Position.Left} id={portHandle(0)} />
      <span className="lamp" aria-hidden="true" />
      <span className="part-label">OUT</span>
      <span className="part-bit">{bitText(value)}</span>
    </div>
  )
}
