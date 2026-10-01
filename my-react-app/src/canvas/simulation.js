import { createContext } from 'react'

// Live simulation results shared with the canvas nodes:
// values (node id -> true / false / null), indices (node id -> number),
// sources (node id -> ids wired into its inputs) and toggle(pinId).
export const SimulationContext = createContext(null)

// A value is true / false, or null when it can't be worked out yet.
export const stateClass = (value) =>
  value === null || value === undefined ? 'is-unknown' : value ? 'is-on' : 'is-off'

export const bitText = (value) => (value === null || value === undefined ? '?' : value ? '1' : '0')
