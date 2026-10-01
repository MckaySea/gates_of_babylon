import { addGate, createCircuit } from './circuit.js'

// The two sample runs from the assignment README. Each gate is written as
// [menu code, ...input indices], exactly as they are typed in the sample run.
export const EXAMPLES = [
  {
    name: 'AND into OR',
    description: '3 inputs: (0 AND 1) OR 2',
    inputs: 3,
    gates: [
      [1, 0, 1],
      [2, 2, 3],
    ],
  },
  {
    name: 'Six NOTs into ANDs',
    description: '6 inputs: 1 only when every pin is 0',
    inputs: 6,
    gates: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [0, 5],
      [1, 6, 7],
      [1, 8, 9],
      [1, 10, 11],
      [1, 12, 13],
      [1, 14, 15],
    ],
  },
]

export function buildExample(example) {
  return example.gates.reduce(
    (circuit, [code, ...indices]) => addGate(circuit, code, indices.map(String)),
    createCircuit(String(example.inputs)),
  )
}
