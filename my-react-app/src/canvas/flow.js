// Converts between React Flow's nodes/edges and the graph in logic/graph.js,
// and lays out circuits from the step-by-step builder on the canvas.

// Gate symbols are drawn in a 64×40 box with inputs at these heights.
export const PORT_Y = { 1: [20], 2: [13, 27] }

export const NODE_SIZE = {
  pin: { width: 112, height: 40 },
  gate: { width: 80, height: 50 },
  output: { width: 96, height: 44 },
}

export const portHandle = (port) => `in${port}`
const handlePort = (handle) => (handle === 'in1' ? 1 : 0)

export function flowToGraph(nodes, edges) {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      kind: node.type,
      gate: node.data.gate,
      order: node.data.order,
      on: Boolean(node.data.on),
    })),
    wires: edges.map((edge) => ({
      from: edge.source,
      to: edge.target,
      port: handlePort(edge.targetHandle),
    })),
  }
}

export const edgeId = ({ source, target, targetHandle }) => `${source}->${target}:${targetHandle}`

export function makeEdge(source, target, port) {
  const edge = { source, sourceHandle: 'out', target, targetHandle: portHandle(port) }
  return { ...edge, id: edgeId(edge) }
}

// part is { kind, gate }; center is where it should go in canvas coordinates.
export function makeNode(part, center, order) {
  const size = NODE_SIZE[part.kind]
  const data = { order }
  if (part.kind === 'gate') data.gate = part.gate
  if (part.kind === 'pin') data.on = false
  return {
    id: part.kind === 'output' ? 'output' : `n${order}`,
    type: part.kind,
    position: { x: center.x - size.width / 2, y: center.y - size.height / 2 },
    data,
  }
}

const COLUMN = 170
const ROW = 76

// Lays a finished circuit out left to right: pins in the first column, each
// gate one column right of its deepest input, and the output at the end. Rows
// follow the tree from the output back to the pins so wires don't cross.
export function circuitToFlow(circuit) {
  const last = circuit.length - 1
  const column = circuit.map(() => 0)
  circuit.forEach((node, i) => {
    if (node.inputs.length) column[i] = 1 + Math.max(...node.inputs.map((input) => column[input]))
  })

  const row = []
  let nextRow = 0
  const place = (i) => {
    const { inputs } = circuit[i]
    if (inputs.length === 0) {
      row[i] = nextRow++
      return
    }
    inputs.forEach(place)
    row[i] = inputs.reduce((sum, input) => sum + row[input], 0) / inputs.length
  }
  place(last)
  circuit.forEach((_, i) => {
    if (row[i] === undefined) row[i] = nextRow++
  })

  const at = (col, r) => ({ x: col * COLUMN, y: r * ROW })
  const nodes = circuit.map((node, i) =>
    makeNode(
      node.type === 'INPUT' ? { kind: 'pin' } : { kind: 'gate', gate: node.type },
      at(column[i], row[i]),
      i,
    ),
  )
  nodes.push(makeNode({ kind: 'output' }, at(column[last] + 1, row[last]), circuit.length))

  const edges = circuit.flatMap((node, i) =>
    node.inputs.map((input, port) => makeEdge(`n${input}`, `n${i}`, port)),
  )
  edges.push(makeEdge(`n${last}`, 'output', 0))
  return { nodes, edges }
}
