import { GATES } from '../logic/circuit.js'
import { PORT_Y } from './flow.js'
import { stateClass } from './simulation.js'

// Standard gate symbols in a 64×40 box: inputs come in from the left at
// PORT_Y, and the output leaves on the right at y = 20.
const BODIES = {
  AND: 'M14 6 H32 A14 14 0 0 1 32 34 H14 Z',
  OR: 'M12 6 Q30 6 46 20 Q30 34 12 34 Q19 20 12 6 Z',
  XOR: 'M16 6 Q34 6 48 20 Q34 34 16 34 Q23 20 16 6 Z',
  NOT: 'M14 7 L42 20 L14 33 Z',
}

// body: which outline to draw; tip: where it ends on the right; bubble: the
// x of the inverting circle, for NOT, NAND and NOR.
const SHAPES = {
  NOT: { body: 'NOT', tip: 42, bubble: 46 },
  AND: { body: 'AND', tip: 46 },
  OR: { body: 'OR', tip: 46 },
  NAND: { body: 'AND', tip: 46, bubble: 50 },
  NOR: { body: 'OR', tip: 46, bubble: 50 },
  XOR: { body: 'XOR', tip: 48 },
}

// inputs and output are true / false / null and only colour the drawing.
export default function GateShape({ type, inputs = [], output, className = '' }) {
  const shape = SHAPES[type]
  const ports = PORT_Y[GATES.find((gate) => gate.name === type).inputs]
  const outStart = shape.bubble ? shape.bubble + 4 : shape.tip

  return (
    <svg viewBox="0 0 64 40" className={`gate-shape ${className}`} aria-hidden="true">
      {ports.map((y, port) => (
        <line key={port} x1="0" x2="20" y1={y} y2={y} className={`gate-lead ${stateClass(inputs[port])}`} />
      ))}
      <line x1={outStart} x2="64" y1="20" y2="20" className={`gate-lead ${stateClass(output)}`} />
      {type === 'XOR' && <path d="M10 6 Q17 20 10 34" className="gate-outline" />}
      <path d={BODIES[shape.body]} className={`gate-body ${stateClass(output)}`} />
      {shape.bubble && <circle cx={shape.bubble} cy="20" r="4" className="gate-bubble" />}
    </svg>
  )
}
