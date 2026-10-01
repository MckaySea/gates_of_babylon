import {
  DONE_CODE,
  GATES,
  circuitBlockLines,
  countInputs,
  gateCode,
  truthTableLines,
} from './circuit.js'

// Rebuilds what the console version (logic.cc) would have printed for the
// current session, so the web app shows the same prompts and output.

export const PROMPTS = {
  welcome: 'Welcome to the Gates of Babylon!',
  count: 'How many inputs does your logic block have? (1 to 10)',
  gate: [
    'What sort of gate do you want to add?',
    '0 - NOT, 1 - AND, 2 - OR, 3 - NAND, 4 - NOR, 5 - XOR, 6 - DONE',
  ],
  output: '1) Print Circuit Block or 2) Print Truth Table',
}

const INDEX_PROMPTS = {
  1: ['Give the index for the input:'],
  2: ['Give the index for the first input:', 'Give the index for the second input:'],
}

// Each line is { text, kind } where kind is 'out' (printed by the program),
// 'typed' (what the user entered) or 'error'.
const out = (text) => ({ text, kind: 'out' })
const typed = (value) => ({ text: String(value), kind: 'typed' })
const BAD_INPUT = { text: 'BAD INPUT!', kind: 'error' }

function gateEntry(code, indexValues) {
  const prompts = INDEX_PROMPTS[GATES[code].inputs]
  return [
    ...PROMPTS.gate.map(out),
    typed(code),
    ...indexValues.flatMap((value, i) => [out(prompts[i]), typed(value)]),
  ]
}

export function transcript({ phase, circuit, view, failure }) {
  const lines = [out(PROMPTS.welcome), out(PROMPTS.count)]
  if (failure?.type === 'start') return [...lines, typed(failure.count), BAD_INPUT]
  if (phase === 'setup') return lines

  const n = countInputs(circuit)
  lines.push(typed(n))
  for (const node of circuit.slice(n)) {
    lines.push(...gateEntry(gateCode(node.type), node.inputs))
  }

  if (failure?.type === 'add') {
    // The console quits as soon as it reads the bad value, so stop there.
    const typedSoFar = failure.indices.slice(0, (failure.field ?? -1) + 1)
    return [...lines, ...gateEntry(failure.code, typedSoFar), BAD_INPUT]
  }
  if (phase === 'build') return [...lines, ...PROMPTS.gate.map(out)]

  lines.push(...PROMPTS.gate.map(out), typed(DONE_CODE))
  if (failure?.type === 'done') return [...lines, BAD_INPUT]

  // anchor marks where the printed output starts, so the console can scroll to it.
  lines.push(out(''), { ...out(PROMPTS.output), anchor: view !== null })
  if (view === 1) lines.push(typed(1), ...circuitBlockLines(circuit).map(out))
  if (view === 2) lines.push(typed(2), ...truthTableLines(circuit).map(out))
  return lines
}
