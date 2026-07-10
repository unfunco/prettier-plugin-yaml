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

describe('yamlAlignValuesProperties', () => {
  it('does not align properties by default', async () => {
    const formatted = await format(`
a     : one
longer:  two
`)

    expect(formatted).toBe(`\
a: one
longer: two
`)
  })

  it('aligns colons across sibling block mapping entries', async () => {
    const formatted = await format(
      `
a: one
longer: two
mid: three
group:
  child: value
`,
      { yamlAlignValuesProperties: 'on_colon' },
    )

    expect(formatted).toBe(`\
a     : one
longer: two
mid   : three
group :
  child: value
`)
  })

  it('aligns scalar values across sibling block mapping entries', async () => {
    const formatted = await format(
      `
a: one
longer: two
mid: three
`,
      { yamlAlignValuesProperties: 'on_value' },
    )

    expect(formatted).toBe(`\
a:      one
longer: two
mid:    three
`)
  })

  it('keeps nested mapping alignment isolated', async () => {
    const formatted = await format(
      `
a: one
long: two
nested:
  x: one
  longer: two
z: three
`,
      { yamlAlignValuesProperties: 'on_value' },
    )

    expect(formatted).toBe(`\
a:    one
long: two
nested:
  x:      one
  longer: two
z:    three
`)
  })

  it('does not align flow mappings or multiline scalar bodies', async () => {
    const formatted = await format(
      `
a: one
long: two
very_long_flow: { short: x, longer: y }
lit: |
  body: stays
`,
      { yamlAlignValuesProperties: 'on_value' },
    )

    expect(formatted).toBe(`\
a:    one
long: two
very_long_flow: { short: x, longer: y }
lit:  |
  body: stays
`)
  })

  it.each(['on_colon', 'on_value'])(
    'is idempotent with %s',
    async (yamlAlignValuesProperties) => {
      const input = `\
a: one
longer: two
nested:
  x: three
  longest: four
`
      const once = await format(input, { yamlAlignValuesProperties })
      const twice = await format(once, { yamlAlignValuesProperties })

      expect(twice).toBe(once)
    },
  )
})

describe('yamlBlockMappingOnNewLine', () => {
  it('keeps block sequence mappings inline by default', async () => {
    const formatted = await format(`
- key: value
  other: value
`)

    expect(formatted).toBe(`\
- key: value
  other: value
`)
  })

  it('puts top-level sequence mappings on a new line', async () => {
    const formatted = await format(
      `
- key: value
  other: value
`,
      { yamlBlockMappingOnNewLine: true },
    )

    expect(formatted).toBe(`\
-
  key: value
  other: value
`)
  })

  it('uses the configured indentation for nested sequence mappings', async () => {
    const formatted = await format(
      `
root:
  - name: parent
    children:
      - name: child
        enabled: true
`,
      {
        tabWidth: 4,
        useTabs: true,
        yamlBlockMappingOnNewLine: true,
        yamlIndentSequenceValue: true,
      },
    )

    expect(formatted).toBe(`\
root:
    -
        name: parent
        children:
            -
                name: child
                enabled: true
`)
  })

  it('does not change ordinary mappings or non-mapping sequence items', async () => {
    const formatted = await format(
      `
metadata:
  owner:
    name: team
items:
  - scalar
  - {key: value}
`,
      { yamlBlockMappingOnNewLine: true },
    )

    expect(formatted).toBe(`\
metadata:
  owner:
    name: team
items:
- scalar
- { key: value }
`)
  })

  it('works with unindented mapping sequence values', async () => {
    const formatted = await format(
      `
root:
  - key: value
    other: value
`,
      {
        yamlBlockMappingOnNewLine: true,
        yamlIndentSequenceValue: false,
      },
    )

    expect(formatted).toBe(`\
root:
-
  key: value
  other: value
`)
  })

  it('preserves comments, anchors, and tags before mappings', async () => {
    const formatted = await format(
      `
- # item comment
  key: value
- &defaults
  first: value
  second: value
- !custom
  tagged: value
`,
      { yamlBlockMappingOnNewLine: true },
    )

    expect(formatted).toBe(`\
- # item comment
  key: value
- &defaults
  first: value
  second: value
- !custom
  tagged: value
`)
  })

  it('preserves mapping value alignment', async () => {
    const formatted = await format(
      `
- short: one
  much_longer: two
`,
      {
        yamlAlignValuesProperties: 'on_value',
        yamlBlockMappingOnNewLine: true,
      },
    )

    expect(formatted).toBe(`\
-
  short:       one
  much_longer: two
`)
  })

  it('is idempotent', async () => {
    const input = `\
root:
-
  key: value
  nested:
  -
    child: value
`
    const options = {
      yamlBlockMappingOnNewLine: true,
      yamlIndentSequenceValue: false,
    }
    const once = await format(input, options)
    const twice = await format(once, options)

    expect(twice).toBe(once)
  })
})

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
