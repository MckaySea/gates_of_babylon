import { useEffect, useRef, useState } from 'react'
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { GATES, MAX_INPUTS, circuitBlockLines } from '../logic/circuit.js'
import { EXAMPLES, buildExample } from '../logic/examples.js'
import {
  consumersOf,
  findProblems,
  graphTruthTable,
  numbering,
  outputOf,
  pinsOf,
  simulate,
  sourcesOf,
  toCircuit,
  wireProblem,
} from '../logic/graph.js'
import AnalysisPanel from './AnalysisPanel.jsx'
import GateShape from './GateShape.jsx'
import { circuitToFlow, edgeId, flowToGraph, makeNode } from './flow.js'
import { GateNode, OutputNode, PinNode } from './nodes.jsx'
import { SimulationContext, stateClass } from './simulation.js'
import './canvas.css'

const nodeTypes = { pin: PinNode, gate: GateNode, output: OutputNode }
const PARTS = [
  { kind: 'pin', label: 'Input' },
  ...GATES.map((gate) => ({ kind: 'gate', gate: gate.name, label: gate.name })),
  { kind: 'output', label: 'Output' },
]
const DRAG_TYPE = 'application/x-gates-part'
const STORAGE_KEY = 'gates-of-babylon:canvas'

function exampleFlow(example) {
  return circuitToFlow(buildExample(example))
}

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(saved?.nodes) && Array.isArray(saved?.edges) ? saved : null
  } catch {
    return null
  }
}

// seed: { nodes, edges } to start from (an example, or a circuit sent over
// from the step-by-step builder). Without one, the last saved canvas is used.
// onReplace(flow) swaps the whole canvas, which App does by remounting it.
export default function CanvasMode(props) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  )
}

function Canvas({ seed, onReplace }) {
  const [initial] = useState(() => seed ?? loadSaved() ?? exampleFlow(EXAMPLES[0]))
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)
  const { screenToFlowPosition, deleteElements } = useReactFlow()
  const wrapperRef = useRef(null)
  const rejectedRef = useRef(null)
  const noticeTimer = useRef(null)
  const [notice, setNotice] = useState(null)

  const graph = flowToGraph(nodes, edges)
  const values = simulate(graph)
  const indices = numbering(graph)
  const sources = sourcesOf(graph)
  const problems = findProblems(graph)
  const pins = pinsOf(graph)
  const output = outputOf(graph)
  const pinLimitReached = pins.length >= MAX_INPUTS

  const rows = graphTruthTable(graph)
  const circuitBlock = problems.length === 0 ? circuitBlockLines(toCircuit(graph)) : null

  useEffect(() => {
    try {
      const strip = ({ id, type, position, data }) => ({ id, type, position, data })
      const wires = edges.map(({ id, source, sourceHandle, target, targetHandle }) => ({
        id,
        source,
        sourceHandle,
        target,
        targetHandle,
      }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes: nodes.map(strip), edges: wires }))
    } catch {
      // Storage can be full or blocked; the canvas still works without it.
    }
  }, [nodes, edges])

  useEffect(() => () => clearTimeout(noticeTimer.current), [])

  function showNotice(text) {
    clearTimeout(noticeTimer.current)
    setNotice(text)
    noticeTimer.current = setTimeout(() => setNotice(null), 4000)
  }

  function setPin(id, on) {
    setNodes((current) =>
      current.map((node) => (node.id === id ? { ...node, data: { ...node.data, on } } : node)),
    )
  }

  function setPins(bits) {
    const numberOf = new Map(pins.map((pin, i) => [pin.id, i]))
    setNodes((current) =>
      current.map((node) =>
        numberOf.has(node.id) ? { ...node, data: { ...node.data, on: bits[numberOf.get(node.id)] === 1 } } : node,
      ),
    )
  }

  const toggle = (id) => setPin(id, !graph.nodes.find((node) => node.id === id).on)
  const simulation = { values, indices, sources, toggle }

  function canAdd(part) {
    if (part.kind === 'pin' && pinLimitReached) return `A logic block has at most ${MAX_INPUTS} inputs.`
    if (part.kind === 'output' && output) return 'There is already an output. A logic block has one.'
    return null
  }

  function addPart(part, center) {
    const problem = canAdd(part)
    if (problem) {
      showNotice(problem)
      return
    }
    const order = Math.max(-1, ...nodes.map((node) => node.data.order)) + 1
    const node = { ...makeNode(part, center, order), selected: true }
    setNodes((current) => [...current.map((other) => ({ ...other, selected: false })), node])
  }

  function addAtCenter(part) {
    const box = wrapperRef.current.getBoundingClientRect()
    const nudge = (nodes.length % 5) * 18
    addPart(part, screenToFlowPosition({ x: box.left + box.width / 2 + nudge, y: box.top + box.height / 2 + nudge }))
  }

  function onDrop(event) {
    event.preventDefault()
    const data = event.dataTransfer.getData(DRAG_TYPE)
    if (!data) return
    addPart(JSON.parse(data), screenToFlowPosition({ x: event.clientX, y: event.clientY }))
  }

  // React Flow asks this while a wire is dragged over a handle. Remember why
  // a wire was refused so it can be explained when the drag ends.
  function isValidConnection(connection) {
    const problem = wireProblem(graph, {
      from: connection.source,
      to: connection.target,
      port: connection.targetHandle === 'in1' ? 1 : 0,
    })
    rejectedRef.current = problem
    return problem === null
  }

  function onConnectEnd(_event, state) {
    if (state.isValid === false && state.toHandle && rejectedRef.current) showNotice(rejectedRef.current)
  }

  const selected = {
    nodes: nodes.filter((node) => node.selected),
    edges: edges.filter((edge) => edge.selected),
  }
  const liveEdges = edges.map((edge) => ({ ...edge, className: `wire ${stateClass(values.get(edge.source))}` }))

  const consumers = consumersOf(graph)
  const parts = [...indices]
    .map(([id, index]) => {
      const node = graph.nodes.find((other) => other.id === id)
      const feeds = consumers.get(id)
      return {
        id,
        index,
        type: node.kind === 'pin' ? 'INPUT' : node.gate,
        inputs: node.kind === 'pin' ? 'switch' : sources.get(id).map((source) => indices.get(source) ?? '–').join(', '),
        feeds: feeds.length ? feeds.map((to) => indices.get(to) ?? 'OUT').join(', ') : '–',
        value: values.get(id),
      }
    })
    .concat(
      output
        ? [
            {
              id: output.id,
              index: 'OUT',
              type: 'OUTPUT',
              inputs: String(indices.get(sources.get(output.id)[0]) ?? '–'),
              feeds: '–',
              value: values.get(output.id),
            },
          ]
        : [],
    )

  return (
    <div className="canvas-mode">
      <section className="canvas-main" aria-label="Circuit canvas">
        <div className="toolbar">
          <div className="palette" aria-label="Parts">
            {PARTS.map((part) => {
              const blocked = canAdd(part)
              return (
                <button
                  key={part.label}
                  type="button"
                  className="palette-item"
                  draggable={!blocked}
                  disabled={Boolean(blocked)}
                  title={blocked ?? `Drag onto the canvas, or click to add ${part.label === 'Input' ? 'an input pin' : `a ${part.label}`}`}
                  onDragStart={(event) => {
                    event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(part))
                    event.dataTransfer.effectAllowed = 'move'
                  }}
                  onClick={() => addAtCenter(part)}
                >
                  <PartIcon part={part} />
                  <span>{part.label}</span>
                </button>
              )
            })}
          </div>
          <div className="toolbar-actions">
            <select
              aria-label="Load an example"
              value=""
              onChange={(event) => {
                const example = EXAMPLES[Number(event.target.value)]
                if (example) onReplace(exampleFlow(example))
              }}
            >
              <option value="" disabled>
                Load example…
              </option>
              {EXAMPLES.map((example, i) => (
                <option key={example.name} value={i}>
                  {example.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="button button-small"
              disabled={selected.nodes.length + selected.edges.length === 0}
              onClick={() => deleteElements(selected)}
            >
              Delete selected
            </button>
            <button
              type="button"
              className="button button-small"
              disabled={nodes.length === 0}
              onClick={() => {
                if (window.confirm('Clear everything on the canvas?')) onReplace({ nodes: [], edges: [] })
              }}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flow" ref={wrapperRef}>
          <SimulationContext.Provider value={simulation}>
            <ReactFlow
              nodes={nodes}
              edges={liveEdges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={(connection) => setEdges((current) => addEdge({ ...connection, id: edgeId(connection) }, current))}
              isValidConnection={isValidConnection}
              onConnectEnd={onConnectEnd}
              onDrop={onDrop}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
              }}
              defaultEdgeOptions={{ type: 'smoothstep' }}
              deleteKeyCode={['Backspace', 'Delete']}
              colorMode="system"
              fitView
              fitViewOptions={{ padding: 0.25, maxZoom: 1.2 }}
              minZoom={0.3}
              maxZoom={2}
            >
              <Background gap={16} />
              <Controls showInteractive={false} />
            </ReactFlow>
          </SimulationContext.Provider>
          {nodes.length === 0 && (
            <p className="flow-empty">Drag parts here from the bar above, or click one to add it.</p>
          )}
          {notice && (
            <p className="flow-notice" role="status">
              {notice}
            </p>
          )}
        </div>

        <p className="flow-help">
          Wire parts by dragging from the dot on a part’s right side to a dot on another’s left. Click a switch to
          turn a pin on or off. Select a part or wire and press Delete to remove it.
        </p>
      </section>

      <AnalysisPanel
        pins={pins.map((pin, number) => ({ id: pin.id, number, on: pin.on }))}
        output={output ? values.get(output.id) : null}
        parts={parts}
        problems={problems}
        rows={rows}
        circuitBlock={circuitBlock}
        onToggle={toggle}
        onSetPins={setPins}
      />
    </div>
  )
}

function PartIcon({ part }) {
  if (part.kind === 'gate') return <GateShape type={part.gate} className="palette-icon" />
  return (
    <svg viewBox="0 0 64 40" className="palette-icon" aria-hidden="true">
      {part.kind === 'pin' ? (
        <>
          <rect x="6" y="10" width="34" height="20" rx="10" className="gate-body is-off" />
          <circle cx="16" cy="20" r="6" className="gate-bubble" />
          <line x1="40" x2="64" y1="20" y2="20" className="gate-lead is-off" />
        </>
      ) : (
        <>
          <line x1="0" x2="28" y1="20" y2="20" className="gate-lead is-off" />
          <circle cx="40" cy="20" r="12" className="gate-body is-off" />
        </>
      )}
    </svg>
  )
}
