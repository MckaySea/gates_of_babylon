import { GATES, MAX_INPUTS, evaluateGate } from './circuit.js'

// A circuit drawn on the canvas. Unlike the step-by-step builder, parts can be
// added and wired in any order, so this module works out their numbering,
// simulates circuits that are still half built, and turns a finished one into
// the flat circuit array from circuit.js.
//
// graph = {
//   nodes: [{ id, kind: 'pin' | 'gate' | 'output', gate, order, on }],
//   wires: [{ from, to, port }],
// }
// gate is the gate type ('AND', ...) for gates, order is when the part was
// added, on is a pin's current state, and port is which input of `to` the
// wire goes into (0 or 1).

const byOrder = (a, b) => a.order - b.order

export function inputCount(node) {
  if (node.kind === 'pin') return 0
  if (node.kind === 'output') return 1
  return GATES.find((gate) => gate.name === node.gate).inputs
}

export function pinsOf(graph) {
  return graph.nodes.filter((node) => node.kind === 'pin').sort(byOrder)
}

export function gatesOf(graph) {
  return graph.nodes.filter((node) => node.kind === 'gate').sort(byOrder)
}

export function outputOf(graph) {
  return graph.nodes.find((node) => node.kind === 'output') ?? null
}

// For each node id, the id wired into each of its inputs (undefined if empty).
export function sourcesOf(graph) {
  const sources = new Map(graph.nodes.map((node) => [node.id, Array(inputCount(node)).fill(undefined)]))
  for (const wire of graph.wires) sources.get(wire.to)[wire.port] = wire.from
  return sources
}

// For each node id, the ids its output is wired into.
export function consumersOf(graph) {
  const consumers = new Map(graph.nodes.map((node) => [node.id, []]))
  for (const wire of graph.wires) consumers.get(wire.from).push(wire.to)
  return consumers
}

// The index of every pin and gate, as the console version would number them:
// pins first, in the order they were added, then gates in an order where each
// gate comes after everything feeding it. Ties go to whichever gate was added
// first, so a circuit built in order keeps its numbers.
export function numbering(graph) {
  const sources = sourcesOf(graph)
  const index = new Map(pinsOf(graph).map((pin, i) => [pin.id, i]))
  let remaining = gatesOf(graph)
  while (remaining.length > 0) {
    const ready = remaining.find((gate) =>
      sources.get(gate.id).every((source) => source === undefined || index.has(source)),
    )
    if (!ready) break // only possible with a loop, which the canvas doesn't allow
    index.set(ready.id, index.size)
    remaining = remaining.filter((gate) => gate !== ready)
  }
  return index
}

// The value of every node. pinValues lists each pin's value by pin number;
// leave it out to use the pins' own on/off switches. A value is null while a
// gate on the way has an input that isn't wired yet.
export function simulate(graph, pinValues) {
  return prepare(graph)(pinValues)
}

// Works out the evaluation order once and returns a function that simulates
// one set of pin values, so the truth table doesn't redo it for every row.
function prepare(graph) {
  const sources = sourcesOf(graph)
  const pins = pinsOf(graph)
  const output = outputOf(graph)
  const byId = new Map(graph.nodes.map((node) => [node.id, node]))
  const gates = [...numbering(graph).keys()].map((id) => byId.get(id)).filter((node) => node.kind === 'gate')

  return (pinValues) => {
    const values = new Map()
    const read = (id) => (id === undefined ? null : (values.get(id) ?? null))
    pins.forEach((pin, i) => values.set(pin.id, Boolean(pinValues ? pinValues[i] : pin.on)))
    for (const gate of gates) {
      const inputs = sources.get(gate.id).map(read)
      values.set(gate.id, inputs.includes(null) ? null : evaluateGate(gate.gate, ...inputs))
    }
    if (output) values.set(output.id, read(sources.get(output.id)[0]))
    return values
  }
}

// Every input combination, counting down from all 1s to all 0s like the
// console version. null while the output can't be worked out yet.
export function graphTruthTable(graph) {
  const output = outputOf(graph)
  if (!output) return null
  const run = prepare(graph)
  const n = pinsOf(graph).length
  const rows = []
  for (let combo = (1 << n) - 1; combo >= 0; combo--) {
    const inputs = Array.from({ length: n }, (_, i) => (combo >> (n - 1 - i)) & 1)
    const value = run(inputs).get(output.id)
    if (value === null) return null
    rows.push({ inputs, output: value ? 1 : 0 })
  }
  return rows
}

const MISSING = {
  1: { 0: 'its input' },
  2: { 0: 'its first input', 1: 'its second input', both: 'both inputs' },
}

// Everything stopping the drawing from being a valid logic block under the
// assignment's rules. Empty when it can be printed like the console version.
export function findProblems(graph) {
  const problems = []
  const pins = pinsOf(graph)
  const gates = gatesOf(graph)
  const output = outputOf(graph)
  const index = numbering(graph)
  const sources = sourcesOf(graph)
  const consumers = consumersOf(graph)
  const name = (node) =>
    node.kind === 'pin' ? `Pin ${index.get(node.id)}` : `Gate ${index.get(node.id)} (${node.gate})`

  if (pins.length === 0) problems.push('Add at least one input pin.')
  if (pins.length > MAX_INPUTS) problems.push(`Use at most ${MAX_INPUTS} input pins.`)
  if (gates.length === 0) problems.push('Add at least one gate.')
  if (!output) problems.push('Add the output.')
  else if (sources.get(output.id)[0] === undefined) problems.push('Wire a gate into the output.')

  for (const gate of gates) {
    const empty = sources.get(gate.id).flatMap((source, port) => (source === undefined ? [port] : []))
    if (empty.length === 0) continue
    const words = MISSING[empty.length === 2 ? 2 : inputCount(gate)]
    problems.push(`${name(gate)} needs a wire into ${empty.length === 2 ? words.both : words[empty[0]]}.`)
  }
  for (const node of [...pins, ...gates]) {
    const count = consumers.get(node.id).length
    if (count === 0) problems.push(`${name(node)} isn't connected to anything.`)
    if (count > 1) problems.push(`${name(node)} feeds more than one part. Each pin and gate can feed only one.`)
  }
  return problems
}

// The finished drawing as a circuit array (see circuit.js), with the gate that
// drives the output last. Only valid when findProblems() is empty.
export function toCircuit(graph) {
  const index = numbering(graph)
  const sources = sourcesOf(graph)
  const circuit = []
  for (const node of graph.nodes) {
    if (!index.has(node.id)) continue
    circuit[index.get(node.id)] =
      node.kind === 'pin'
        ? { type: 'INPUT', inputs: [] }
        : { type: node.gate, inputs: sources.get(node.id).map((source) => index.get(source)) }
  }
  return circuit
}

// Why a new wire from `from` into input `port` of `to` isn't allowed, or null
// if it is. These are the assignment's rules, plus no loops.
export function wireProblem(graph, { from, to, port }) {
  if (from === to) return "A part can't feed itself."
  if (graph.wires.some((wire) => wire.to === to && wire.port === port)) {
    return 'That input already has a wire. Delete it first to rewire.'
  }
  if (graph.wires.some((wire) => wire.from === from)) {
    return 'Each pin and gate can feed only one part. Delete its other wire first.'
  }
  const consumers = consumersOf(graph)
  const stack = [to]
  const seen = new Set()
  while (stack.length > 0) {
    const id = stack.pop()
    if (id === from) return 'That wire would make a loop.'
    if (seen.has(id)) continue
    seen.add(id)
    stack.push(...consumers.get(id))
  }
  return null
}
