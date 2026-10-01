// Run with: npm test
// Expected text is copied from the sample runs in the assignment README
// (which shows tabs expanded to 8 spaces).
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  BadInputError,
  addGate,
  circuitBlockLines,
  createCircuit,
  evaluateGate,
  finishCircuit,
  truthTableLines,
} from './circuit.js'
import { EXAMPLES, buildExample } from './examples.js'
import { transcript } from './transcript.js'

const expandTabs = (text) => text.replaceAll('\t', '        ')
const print = (lines) => expandTabs(lines.map((line) => `${line.text ?? line}\n`).join(''))

const [andIntoOr, sixNots] = EXAMPLES.map(buildExample)

describe('README sample run 1: AND into OR', () => {
  test('full console transcript, printing the circuit block', () => {
    const session = { phase: 'done', circuit: finishCircuit(andIntoOr), view: 1, failure: null }
    assert.equal(
      print(transcript(session)),
      `Welcome to the Gates of Babylon!
How many inputs does your logic block have? (1 to 10)
3
What sort of gate do you want to add?
0 - NOT, 1 - AND, 2 - OR, 3 - NAND, 4 - NOR, 5 - XOR, 6 - DONE
1
Give the index for the first input:
0
Give the index for the second input:
1
What sort of gate do you want to add?
0 - NOT, 1 - AND, 2 - OR, 3 - NAND, 4 - NOR, 5 - XOR, 6 - DONE
2
Give the index for the first input:
2
Give the index for the second input:
3
What sort of gate do you want to add?
0 - NOT, 1 - AND, 2 - OR, 3 - NAND, 4 - NOR, 5 - XOR, 6 - DONE
6

1) Print Circuit Block or 2) Print Truth Table
1
Gate Type: INPUT
        Input Connected to Index: N.C. and N.C.
        Output Connected to Index: 3
        Value: X

Gate Type: INPUT
        Input Connected to Index: N.C. and N.C.
        Output Connected to Index: 3
        Value: X

Gate Type: INPUT
        Input Connected to Index: N.C. and N.C.
        Output Connected to Index: 4
        Value: X

Gate Type: AND
        Input Connected to Index: 0 and 1
        Output Connected to Index: 4
        Value: X

Gate Type: OR
        Input Connected to Index: 2 and 3
        Output Connected to Index: OUTPUT PIN
        Value: X

`,
    )
  })

  test('truth table', () => {
    assert.equal(
      print(truthTableLines(andIntoOr)),
      `Input Pins (Numbers), Output Pin (O):
0|1|2|O
1|1|1|1
1|1|0|1
1|0|1|1
1|0|0|0
0|1|1|1
0|1|0|0
0|0|1|1
0|0|0|0
`,
    )
  })
})

describe('README sample run 2: six NOTs into ANDs', () => {
  test('circuit block', () => {
    const entry = (type, inputs, output) =>
      `Gate Type: ${type}\n        Input Connected to Index: ${inputs}\n        Output Connected to Index: ${output}\n        Value: X\n\n`
    const expected = [
      entry('INPUT', 'N.C. and N.C.', 6),
      entry('INPUT', 'N.C. and N.C.', 7),
      entry('INPUT', 'N.C. and N.C.', 8),
      entry('INPUT', 'N.C. and N.C.', 9),
      entry('INPUT', 'N.C. and N.C.', 10),
      entry('INPUT', 'N.C. and N.C.', 11),
      entry('NOT', '0', 12),
      entry('NOT', '1', 12),
      entry('NOT', '2', 13),
      entry('NOT', '3', 13),
      entry('NOT', '4', 14),
      entry('NOT', '5', 14),
      entry('AND', '6 and 7', 15),
      entry('AND', '8 and 9', 15),
      entry('AND', '10 and 11', 16),
      entry('AND', '12 and 13', 16),
      entry('AND', '14 and 15', 'OUTPUT PIN'),
    ].join('')
    assert.equal(print(circuitBlockLines(sixNots)), expected)
  })

  test('truth table is 1 only when every pin is 0', () => {
    const lines = truthTableLines(sixNots)
    assert.equal(lines.length, 2 + 64)
    assert.equal(lines[1], '0|1|2|3|4|5|O')
    assert.equal(lines[2], '1|1|1|1|1|1|0')
    assert.equal(lines[3], '1|1|1|1|1|0|0')
    assert.equal(lines.at(-1), '0|0|0|0|0|0|1')
    assert.equal(lines.filter((line) => line.endsWith('|1')).length, 1)
  })
})

describe('gates', () => {
  const cases = {
    NOT: [1, 1, 0, 0],
    AND: [0, 0, 0, 1],
    OR: [0, 1, 1, 1],
    NAND: [1, 1, 1, 0],
    NOR: [1, 0, 0, 0],
    XOR: [0, 1, 1, 0],
  }
  for (const [type, expected] of Object.entries(cases)) {
    test(type, () => {
      const pairs = [[false, false], [false, true], [true, false], [true, true]]
      assert.deepEqual(
        pairs.map(([a, b]) => Number(evaluateGate(type, a, b))),
        expected,
      )
    })
  }

  test('a single-input circuit with one NOT', () => {
    const circuit = finishCircuit(addGate(createCircuit('1'), 0, ['0']))
    assert.deepEqual(truthTableLines(circuit), [
      'Input Pins (Numbers), Output Pin (O):',
      '0|O',
      '1|0',
      '0|1',
    ])
  })
})

describe('BAD INPUT!', () => {
  const rejects = (fn) => assert.throws(fn, BadInputError)
  const three = createCircuit('3')

  test('input count must be 1 to 10', () => {
    for (const bad of ['0', '11', '-2', '2.5', 'abc', '']) rejects(() => createCircuit(bad))
    assert.equal(createCircuit('1').length, 1)
    assert.equal(createCircuit(' 10 ').length, 10)
  })

  test('gate inputs must be existing indices', () => {
    rejects(() => addGate(three, 1, ['0', '3']))
    rejects(() => addGate(three, 1, ['-1', '0']))
    rejects(() => addGate(three, 1, ['x', '0']))
    rejects(() => addGate(three, 1, ['0', '']))
    rejects(() => addGate(three, 9, ['0', '1']))
  })

  test('a pin or gate can feed only one gate', () => {
    const withAnd = addGate(three, 1, ['0', '1'])
    rejects(() => addGate(withAnd, 0, ['0']))
    rejects(() => addGate(three, 1, ['2', '2']))
  })

  test('reports which index prompt was bad', () => {
    assert.throws(() => addGate(three, 1, ['0', '7']), { field: 1 })
  })

  test('DONE needs a gate, and everything but the last gate connected', () => {
    rejects(() => finishCircuit(three))
    rejects(() => finishCircuit(addGate(three, 1, ['0', '1'])))
    assert.doesNotThrow(() => finishCircuit(andIntoOr))
  })

  test('the transcript stops at the bad value', () => {
    const lines = transcript({
      phase: 'bad',
      circuit: three,
      view: null,
      failure: { type: 'add', code: 1, indices: ['9', '0'], field: 0 },
    })
    assert.deepEqual(
      lines.slice(-4).map((line) => line.text),
      ['1', 'Give the index for the first input:', '9', 'BAD INPUT!'],
    )
  })
})
