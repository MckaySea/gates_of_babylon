import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { circuitToFlow, flowToGraph, makeEdge, makeNode } from '../canvas/flow.js'
import { truthTable } from './circuit.js'
import { EXAMPLES, buildExample } from './examples.js'
import {
  findProblems,
  graphTruthTable,
  numbering,
  simulate,
  toCircuit,
  wireProblem,
} from './graph.js'

const toGraph = ({ nodes, edges }) => flowToGraph(nodes, edges)
const at = { x: 0, y: 0 }

describe('README circuits on the canvas', () => {
  for (const example of EXAMPLES) {
    const circuit = buildExample(example)
    const graph = toGraph(circuitToFlow(circuit))

    test(`${example.name}: round-trips to the same circuit`, () => {
      assert.deepEqual(findProblems(graph), [])
      assert.deepEqual(toCircuit(graph), circuit)
    })

    test(`${example.name}: same truth table`, () => {
      assert.deepEqual(graphTruthTable(graph), truthTable(circuit))
    })
  }
})

describe('drawing in any order', () => {
  // Gate n3 (OR) is added before gate n4 (AND) but takes its output, so the
  // AND must be numbered first for the circuit to print like the console's.
  const graph = toGraph({
    nodes: [
      makeNode({ kind: 'pin' }, at, 0),
      makeNode({ kind: 'pin' }, at, 1),
      makeNode({ kind: 'pin' }, at, 2),
      makeNode({ kind: 'gate', gate: 'OR' }, at, 3),
      makeNode({ kind: 'gate', gate: 'AND' }, at, 4),
      makeNode({ kind: 'output' }, at, 5),
    ],
    edges: [
      makeEdge('n0', 'n4', 0),
      makeEdge('n1', 'n4', 1),
      makeEdge('n2', 'n3', 0),
      makeEdge('n4', 'n3', 1),
      makeEdge('n3', 'output', 0),
    ],
  })

  test('numbers gates after the gates feeding them', () => {
    assert.deepEqual([...numbering(graph)], [['n0', 0], ['n1', 1], ['n2', 2], ['n4', 3], ['n3', 4]])
    assert.deepEqual(toCircuit(graph), buildExample(EXAMPLES[0]))
  })

  test('simulates the current switch positions', () => {
    const on = (ids) => ({ ...graph, nodes: graph.nodes.map((node) => ({ ...node, on: ids.includes(node.id) })) })
    assert.equal(simulate(on(['n0'])).get('output'), false)
    assert.equal(simulate(on(['n0', 'n1'])).get('output'), true)
    assert.equal(simulate(on(['n2'])).get('n4'), false)
    assert.equal(simulate(on(['n2'])).get('output'), true)
  })
})

describe('half-built circuits', () => {
  const graph = toGraph({
    nodes: [
      makeNode({ kind: 'pin' }, at, 0),
      makeNode({ kind: 'pin' }, at, 1),
      makeNode({ kind: 'gate', gate: 'AND' }, at, 2),
      makeNode({ kind: 'output' }, at, 3),
    ],
    edges: [makeEdge('n0', 'n2', 0), makeEdge('n2', 'output', 0)],
  })

  test('values past an empty input are unknown', () => {
    const values = simulate(graph)
    assert.equal(values.get('n0'), false)
    assert.equal(values.get('n2'), null)
    assert.equal(values.get('output'), null)
    assert.equal(graphTruthTable(graph), null)
  })

  test('lists what is left to do', () => {
    assert.deepEqual(findProblems(graph), [
      'Gate 2 (AND) needs a wire into its second input.',
      "Pin 1 isn't connected to anything.",
    ])
    assert.deepEqual(findProblems({ nodes: [], wires: [] }), [
      'Add at least one input pin.',
      'Add at least one gate.',
      'Add the output.',
    ])
  })
})

describe('wiring rules', () => {
  const graph = toGraph({
    nodes: [
      makeNode({ kind: 'pin' }, at, 0),
      makeNode({ kind: 'pin' }, at, 1),
      makeNode({ kind: 'gate', gate: 'AND' }, at, 2),
      makeNode({ kind: 'gate', gate: 'NOT' }, at, 3),
    ],
    edges: [makeEdge('n0', 'n2', 0), makeEdge('n2', 'n3', 0)],
  })

  test('allows a free output into a free input', () => {
    assert.equal(wireProblem(graph, { from: 'n1', to: 'n2', port: 1 }), null)
  })

  test('rejects a second wire into an input', () => {
    assert.match(wireProblem(graph, { from: 'n1', to: 'n2', port: 0 }), /already has a wire/)
  })

  test('rejects a second wire out of a pin or gate', () => {
    assert.match(wireProblem(graph, { from: 'n0', to: 'n2', port: 1 }), /feed only one/)
  })

  test('rejects loops', () => {
    assert.match(wireProblem(graph, { from: 'n3', to: 'n2', port: 1 }), /loop/)
    assert.match(wireProblem(graph, { from: 'n2', to: 'n2', port: 1 }), /itself/)
  })
})
