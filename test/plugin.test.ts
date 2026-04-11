// SPDX-FileCopyrightText: 2026 Daniel Morris <daniel@honestempire.com>
// SPDX-License-Identifier: MIT

import prettier from 'prettier'
import * as builtinYamlPlugin from 'prettier/plugins/yaml'
import { describe, expect, it } from 'vitest'
import plugin from '../src/index.ts'

async function format(text: string, options: Record<string, unknown> = {}) {
  return prettier.format(text, {
    parser: 'yaml',
    plugins: [builtinYamlPlugin, plugin],
    ...options,
  })
}

describe('yamlIndentSequenceValue: false (default)', () => {
  it('unindents top-level sequence values', async () => {
    const formatted = await format(`
property:
  - object_one: 1
    object_one_property_two: 2
  - object_two: 2
    object_two_property_two: 2
`)

    expect(formatted).toBe(`\
property:
- object_one: 1
  object_one_property_two: 2
- object_two: 2
  object_two_property_two: 2
`)
  })

  it('unindents nested sequence values', async () => {
    const formatted = await format(`
root:
  - name: one
    attrs:
      - a
      - b
`)

    expect(formatted).toBe(`\
root:
- name: one
  attrs:
  - a
  - b
`)
  })

  it('only removes the mapping indent that belongs to the sequence value', async () => {
    const formatted = await format(`
root:
  - child:
      nested:
        key: value
      list:
        - 1
        - 2
`)

    expect(formatted).toBe(`\
root:
- child:
    nested:
      key: value
    list:
    - 1
    - 2
`)
  })

  it('keeps sequence comments aligned with the sequence', async () => {
    const formatted = await format(`
property:
  # comment
  - a
`)

    expect(formatted).toBe(`\
property:
# comment
- a
`)
  })
})

describe('yamlIndentSequenceValue: true', () => {
  it("preserves Prettier's native indented sequence output", async () => {
    const formatted = await format(
      `
property:
  - object_one: 1
    object_one_property_two: 2
  - object_two: 2
    object_two_property_two: 2
`,
      { yamlIndentSequenceValue: true },
    )

    expect(formatted).toBe(`\
property:
  - object_one: 1
    object_one_property_two: 2
  - object_two: 2
    object_two_property_two: 2
`)
  })
})

describe('yamlSpacesWithinBrackets: true (default)', () => {
  it('adds spaces inside flow sequences by default', async () => {
    const formatted = await format(
      `
property: [verify]
`,
    )

    expect(formatted).toBe('property: [ verify ]\n')
  })

  it('adds spaces inside empty flow sequences by default', async () => {
    const formatted = await format(
      `
property: []
`,
    )

    expect(formatted).toBe('property: [ ]\n')
  })

  it('adds spaces to multi-line flow sequences after flattening by default', async () => {
    const formatted = await format(
      `
key:
  [
    a,
    b
  ]
`,
    )

    expect(formatted).toBe(`\
key: [ a, b ]
`)
  })

  it('can disable spaces inside flow sequences', async () => {
    const formatted = await format(
      `
property: [ verify ]
`,
      { yamlSpacesWithinBrackets: false },
    )

    expect(formatted).toBe('property: [verify]\n')
  })
})

describe('yamlSpacesWithinBraces: true (default)', () => {
  it('adds spaces inside empty flow mappings by default', async () => {
    const formatted = await format(
      `
property: {}
`,
    )

    expect(formatted).toBe('property: { }\n')
  })

  it('overrides bracketSpacing=false for flow mappings by default', async () => {
    const formatted = await format(
      `
property: {a: 1}
`,
      { bracketSpacing: false },
    )

    expect(formatted).toBe('property: { a: 1 }\n')
  })

  it('can disable spaces inside flow mappings independent of bracketSpacing', async () => {
    const formatted = await format(
      `
property: { a: 1 }
`,
      { yamlSpacesWithinBraces: false },
    )

    expect(formatted).toBe('property: {a: 1}\n')
  })
})

describe('split flow collection spacing options', () => {
  it('spaces braces without spacing brackets', async () => {
    const formatted = await format(
      `
property: [{}, [a]]
`,
      { yamlSpacesWithinBrackets: false },
    )

    expect(formatted).toBe('property: [{ }, [a]]\n')
  })

  it('spaces brackets without spacing braces', async () => {
    const formatted = await format(
      `
property: [{}, [a]]
`,
      { yamlSpacesWithinBraces: false },
    )

    expect(formatted).toBe('property: [ {}, [ a ] ]\n')
  })
})
