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

describe('yamlIndentSequenceValues: false (default)', () => {
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

  it('keeps flow sequences unchanged', async () => {
    const formatted = await format(`
property: [a, b]
`)

    expect(formatted).toBe('property: [a, b]\n')
  })

  it('keeps multi-line flow sequences unchanged', async () => {
    const formatted = await format(`
key:
  [
    a,
    b
  ]
`)
    expect(formatted).toBe(`\
key: [a, b]
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

describe('yamlIndentSequenceValues: true', () => {
  it("preserves Prettier's native indented sequence output", async () => {
    const formatted = await format(
      `
property:
  - object_one: 1
    object_one_property_two: 2
  - object_two: 2
    object_two_property_two: 2
`,
      { yamlIndentSequenceValues: true },
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
