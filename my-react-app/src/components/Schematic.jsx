import { createElement } from 'react'
// logidrom's main entry also loads its FIR-filter renderer, which requires
// 'onml' without listing it as a dependency and breaks the build, so import
// just the renderer we use.
import renderAssign from 'logidrom/lib/render-assign.js'
import { countInputs, findUnconnected } from '../logic/circuit.js'

// logidrom draws logic expressions as SVG. Because every pin and gate feeds
// exactly one gate, each finished circuit is a tree rooted at the last gate,
// which is exactly the shape logidrom expects.
const SYMBOLS = { NOT: '~', AND: '&', OR: '|', NAND: '~&', NOR: '~|', XOR: '^' }
const SCALE = 1.35

// ['=', label, expr] puts a label on a wire, so each gate's output wire is
// tagged with its index, matching the numbers the user types.
function expression(circuit, idx) {
  const node = circuit[idx]
  if (node.type === 'INPUT') return String(idx)
  const inputs = node.inputs.map((input) => expression(circuit, input))
  return ['=', String(idx), [SYMBOLS[node.type], ...inputs]]
}

// logidrom returns JsonML (['tag', {attrs}, ...children]); turn it into React
// elements rather than injecting an SVG string.
function toReact(node) {
  if (!Array.isArray(node)) return node
  const [tag, ...rest] = node
  const hasAttrs = rest[0] && typeof rest[0] === 'object' && !Array.isArray(rest[0])
  const attrs = hasAttrs ? rest.shift() : {}
  const props = {}
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'w' || name === 'h') continue // layout notes logidrom leaves on nodes
    const prop = name === 'class' ? 'className' : name.replace(/[-:](\w)/g, (_, c) => c.toUpperCase())
    props[prop] = Array.isArray(value) ? value.join(' ') : value
  }
  return createElement(tag, props, ...rest.map(toReact))
}

export default function Schematic({ circuit, finished }) {
  const n = countInputs(circuit)
  const gateRoots = findUnconnected(circuit).filter((idx) => idx >= n)

  if (gateRoots.length === 0) {
    return (
      <p className="schematic-empty">
        {n === 0
          ? 'Your circuit will be drawn here.'
          : `Pins 0${n > 1 ? `–${n - 1}` : ''} are ready. Add a gate to start drawing.`}
      </p>
    )
  }

  // A finished circuit is one tree ending at the output pin. While building,
  // every gate that isn't connected to anything yet is drawn as its own tree.
  // (logidrom writes layout data into the tree, so build a fresh one each time.)
  const assign = finished
    ? [['=', 'OUT', expression(circuit, circuit.length - 1)]]
    : gateRoots.map((idx) => expression(circuit, idx))

  // Any index other than 0 leaves out logidrom's built-in <style>, which would
  // leak into the whole page; App.css styles the classes instead.
  const [, svgAttrs, ...children] = renderAssign(1, { assign })
  const width = Math.ceil(svgAttrs.width * SCALE)
  const height = Math.ceil(svgAttrs.height * SCALE)

  return (
    <div className="schematic-scroll">
      <svg
        className="schematic"
        viewBox={svgAttrs.viewBox}
        width={width}
        height={height}
        role="img"
        aria-label={finished ? 'Finished circuit schematic' : 'Circuit schematic so far'}
      >
        {toReact(['g', ...children])}
      </svg>
    </div>
  )
}
