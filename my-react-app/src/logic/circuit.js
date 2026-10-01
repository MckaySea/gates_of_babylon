// Port of logic.cc. The circuit is one flat array of nodes: the first n
// entries are the input pins, and every entry after that is a gate, numbered
// in the order it was added. A gate can only use nodes that already exist, so
// there are no loops and the array is always in evaluation order.

export const MIN_INPUTS = 1
export const MAX_INPUTS = 10

// Menu codes match the console prompt:
// 0 - NOT, 1 - AND, 2 - OR, 3 - NAND, 4 - NOR, 5 - XOR, 6 - DONE
export const GATES = [
  { code: 0, name: 'NOT', inputs: 1 },
  { code: 1, name: 'AND', inputs: 2 },
  { code: 2, name: 'OR', inputs: 2 },
  { code: 3, name: 'NAND', inputs: 2 },
  { code: 4, name: 'NOR', inputs: 2 },
  { code: 5, name: 'XOR', inputs: 2 },
]
export const DONE_CODE = 6

export class BadInputError extends Error {
  // reason explains what was wrong; field is which index prompt (0 or 1)
  // held the bad value, when the problem was with a gate's inputs.
  constructor(reason, field = null) {
    super('BAD INPUT!')
    this.name = 'BadInputError'
    this.reason = reason
    this.field = field
  }
}

// Strict whole-number parse: "3" is fine, "3.5", "abc" and "" are not.
export function parseInteger(text) {
  const trimmed = String(text).trim()
  return /^[+-]?\d+$/.test(trimmed) ? Number(trimmed) : null
}

export function countInputs(circuit) {
  return circuit.filter((node) => node.type === 'INPUT').length
}

export function gateCode(type) {
  return GATES.findIndex((gate) => gate.name === type)
}

// For every node, the index of the gate that uses it as an input, or -1 if
// nothing does yet. (compute_outputs() in the C++ version.)
export function findConsumers(circuit) {
  const consumers = circuit.map(() => -1)
  circuit.forEach((node, idx) => {
    for (const input of node.inputs) consumers[input] = idx
  })
  return consumers
}

// Indices of every pin and gate whose output isn't connected to anything yet.
export function findUnconnected(circuit) {
  return findConsumers(circuit).flatMap((consumer, idx) => (consumer === -1 ? [idx] : []))
}

//====================================================
// Building the circuit
//====================================================

export function createCircuit(countText) {
  const n = parseInteger(countText)
  if (n === null || n < MIN_INPUTS || n > MAX_INPUTS) {
    throw new BadInputError(
      `The number of inputs has to be a whole number from ${MIN_INPUTS} to ${MAX_INPUTS}.`,
    )
  }
  return Array.from({ length: n }, () => ({ type: 'INPUT', inputs: [] }))
}

// Returns a new circuit with the gate appended. Each pin and gate may feed
// exactly one gate, so an index that is already connected is bad input.
export function addGate(circuit, code, indexTexts) {
  const gate = GATES[code]
  if (!gate) throw new BadInputError(`Gate choice must be 0 to ${DONE_CODE}.`)

  const consumers = findConsumers(circuit)
  const inputs = []
  for (let field = 0; field < gate.inputs; field++) {
    const text = indexTexts[field] ?? ''
    const idx = parseInteger(text)
    if (idx === null || idx < 0 || idx >= circuit.length) {
      throw new BadInputError(
        `"${text}" isn't an existing index. Pick one from 0 to ${circuit.length - 1}.`,
        field,
      )
    }
    if (consumers[idx] !== -1) {
      throw new BadInputError(
        `Index ${idx} is already connected to gate ${consumers[idx]}. Each pin and gate can feed only one gate.`,
        field,
      )
    }
    if (inputs.includes(idx)) {
      throw new BadInputError(
        `Index ${idx} can't feed both inputs of the same gate.`,
        field,
      )
    }
    inputs.push(idx)
  }
  return [...circuit, { type: gate.name, inputs }]
}

// Called when the user picks DONE. The last gate becomes the output pin, and
// everything else must already be connected to exactly one gate.
export function finishCircuit(circuit) {
  if (circuit.length === countInputs(circuit)) {
    throw new BadInputError('Add at least one gate before choosing DONE.')
  }
  const unconnected = findUnconnected(circuit).filter((idx) => idx !== circuit.length - 1)
  if (unconnected.length > 0) {
    throw new BadInputError(
      `Index ${unconnected.join(', ')} ${unconnected.length === 1 ? "isn't" : "aren't"} connected to any gate. Only the last gate may be left over, because it becomes the output.`,
    )
  }
  return circuit
}

//====================================================
// Evaluating the circuit
//====================================================

export function evaluateGate(type, a, b) {
  switch (type) {
    case 'NOT':
      return !a
    case 'AND':
      return a && b
    case 'OR':
      return a || b
    case 'NAND':
      return !(a && b)
    case 'NOR':
      return !(a || b)
    case 'XOR':
      return a !== b
    default:
      throw new Error(`Unknown gate type ${type}`)
  }
}

// Evaluates the whole circuit for one combination of inputs. Bit (n - 1 - i)
// of combo is pin i, so pin 0 is the most significant bit, as in the C++.
export function evaluateCircuit(circuit, combo) {
  const n = countInputs(circuit)
  const values = []
  circuit.forEach((node, idx) => {
    values[idx] =
      node.type === 'INPUT'
        ? Boolean((combo >> (n - 1 - idx)) & 1)
        : evaluateGate(node.type, ...node.inputs.map((input) => values[input]))
  })
  return values[values.length - 1]
}

// Every input combination, counting down from all 1s to all 0s.
export function truthTable(circuit) {
  const n = countInputs(circuit)
  const rows = []
  for (let combo = (1 << n) - 1; combo >= 0; combo--) {
    const inputs = Array.from({ length: n }, (_, i) => (combo >> (n - 1 - i)) & 1)
    rows.push({ inputs, output: evaluateCircuit(circuit, combo) ? 1 : 0 })
  }
  return rows
}

//====================================================
// Printing, in the exact format from the README
//====================================================

export function circuitBlockLines(circuit) {
  const consumers = findConsumers(circuit)
  return circuit.flatMap((node, idx) => [
    `Gate Type: ${node.type}`,
    `\tInput Connected to Index: ${node.type === 'INPUT' ? 'N.C. and N.C.' : node.inputs.join(' and ')}`,
    `\tOutput Connected to Index: ${idx === circuit.length - 1 ? 'OUTPUT PIN' : consumers[idx]}`,
    '\tValue: X',
    '',
  ])
}

export function truthTableLines(circuit) {
  return formatTruthTable(countInputs(circuit), truthTable(circuit))
}

// Shared with the canvas, which builds its rows from the drawn circuit.
export function formatTruthTable(pinCount, rows) {
  const header = [...Array.from({ length: pinCount }, (_, i) => i), 'O'].join('|')
  return [
    'Input Pins (Numbers), Output Pin (O):',
    header,
    ...rows.map((row) => [...row.inputs, row.output].join('|')),
  ]
}
