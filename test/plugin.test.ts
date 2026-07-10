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

describe('yamlSpaceBeforeColon', () => {
  it('uses native no-space mapping separators by default', async () => {
    const formatted = await format(`
block : value
flow: { key : value, other: next }
`)

    expect(formatted).toBe(`\
block: value
flow: { key: value, other: next }
`)
  })

  it('adds one space before block mapping colons', async () => {
    const formatted = await format(
      `
short: one
longer: two
empty:
explicit: null
`,
      { yamlSpaceBeforeColon: true },
    )

    expect(formatted).toBe(`\
short : one
longer : two
empty :
explicit : null
`)
  })

  it('adds one space before flow mapping colons', async () => {
    const formatted = await format(
      `
{key: value, nested: {inner: true}, list: [{x: y}]}
`,
      { printWidth: 40, yamlSpaceBeforeColon: true },
    )

    expect(formatted).toBe(`\
{
  key : value,
  nested : { inner : true },
  list : [ { x : y } ],
}
`)
  })

  it('handles nested mappings and mappings in sequences', async () => {
    const formatted = await format(
      `
root:
  child: value
items:
  - name: first
    data: {key: value}
`,
      { yamlSpaceBeforeColon: true },
    )

    expect(formatted).toBe(`\
root :
  child : value
items :
  - name : first
    data : { key : value }
`)
  })

  it('handles quoted and compact complex mapping keys', async () => {
    const formatted = await format(
      `
"quoted:key": value
'other:key': next
? [a, b]
: complex
`,
      { yamlSpaceBeforeColon: true },
    )

    expect(formatted).toBe(`\
"quoted:key" : value
"other:key" : next
[ a, b ] : complex
`)
  })

  it('does not alter colon content or YAML structural markers', async () => {
    const formatted = await format(
      `
%YAML 1.2
---
tagged: !<tag:example.com,2026:test> value
anchored: &anchor value
alias: *anchor
url: https://example.com:8443/a
time: 12:34:56
quoted: "a:b"
literal: |
  body: stays
...
`,
      { yamlSpaceBeforeColon: true },
    )

    expect(formatted).toBe(`\
%YAML 1.2
---
tagged : !<tag:example.com,2026:test> value
anchored : &anchor value
alias : *anchor
url : https://example.com:8443/a
time : 12:34:56
quoted : "a:b"
literal : |
  body: stays
...
`)
  })

  it('aligns colons with a base space before every separator', async () => {
    const formatted = await format(
      `
a: one
longer: two
`,
      {
        yamlAlignValuesProperties: 'on_colon',
        yamlSpaceBeforeColon: true,
      },
    )

    expect(formatted).toBe(`\
a      : one
longer : two
`)
  })

  it('aligns value starts while adding the pre-colon space', async () => {
    const formatted = await format(
      `
a: one
longer: two
`,
      {
        yamlAlignValuesProperties: 'on_value',
        yamlSpaceBeforeColon: true,
      },
    )

    expect(formatted).toBe(`\
a :      one
longer : two
`)
  })

  it('preserves source line breaks before simple scalar values', async () => {
    const formatted = await format(
      `
short:
  value
longer: inline
`,
      { yamlSpaceBeforeColon: true },
    )

    expect(formatted).toBe(`\
short :
  value
longer : inline
`)
  })

  it('keeps wrapped explicit mapping separators valid', async () => {
    const formatted = await format(
      `
? [a-very-long-complex-key-part, another-long-complex-key-part]
: value
`,
      { printWidth: 30, yamlSpaceBeforeColon: true },
    )

    expect(formatted).toBe(`\
? [
    a-very-long-complex-key-part,
    another-long-complex-key-part,
  ]
: value
`)
    await expect(format(formatted, { printWidth: 30 })).resolves.toBe(formatted)
  })

  it.each(['do_not_align', 'on_colon', 'on_value'] as const)(
    'is idempotent with %s alignment',
    async (yamlAlignValuesProperties) => {
      const options = {
        yamlAlignValuesProperties,
        yamlSpaceBeforeColon: true,
      }
      const input = `\
root:
  short: one
  longer: {nested: value}
items:
- key: "a:b"
`
      const once = await format(input, options)
      const twice = await format(once, options)

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

describe('yamlSequenceOnNewLine', () => {
  it('keeps nested block sequences inline by default', async () => {
    const formatted = await format(`
- - one
  - two
`)

    expect(formatted).toBe(`\
- - one
  - two
`)
  })

  it('puts multiple top-level nested block sequences on new lines', async () => {
    const formatted = await format(
      `
- - one
  - two
- - three
  - four
`,
      { yamlSequenceOnNewLine: true },
    )

    expect(formatted).toBe(`\
-
  - one
  - two
-
  - three
  - four
`)
  })

  it('puts recursively nested block sequences on new lines', async () => {
    const formatted = await format(
      `
root:
  - - first
    - - second
      - third
`,
      { yamlSequenceOnNewLine: true },
    )

    expect(formatted).toBe(`\
root:
-
  - first
  -
    - second
    - third
`)
  })

  it('uses the configured indentation', async () => {
    const formatted = await format(
      `
root:
    - - one
      - two
`,
      {
        tabWidth: 4,
        yamlIndentSequenceValue: true,
        yamlSequenceOnNewLine: true,
      },
    )

    expect(formatted).toBe(`\
root:
    -
        - one
        - two
`)
  })

  it.each([
    {
      expected: `\
root:
-
  - one
  - two
`,
      yamlIndentSequenceValue: false,
    },
    {
      expected: `\
root:
  -
    - one
    - two
`,
      yamlIndentSequenceValue: true,
    },
  ])(
    'works with yamlIndentSequenceValue=$yamlIndentSequenceValue',
    async ({ expected, yamlIndentSequenceValue }) => {
      const formatted = await format(
        `
root:
  - - one
    - two
`,
        { yamlIndentSequenceValue, yamlSequenceOnNewLine: true },
      )

      expect(formatted).toBe(expected)
    },
  )

  it('works independently from yamlBlockMappingOnNewLine', async () => {
    const formatted = await format(
      `
- - one
  - two
- key: value
  other: value
`,
      {
        yamlBlockMappingOnNewLine: true,
        yamlSequenceOnNewLine: true,
      },
    )

    expect(formatted).toBe(`\
-
  - one
  - two
-
  key: value
  other: value
`)
  })

  it('does not change scalar, flow collection, mapping, or ordinary sequence values', async () => {
    const formatted = await format(
      `
- scalar
- [one, two]
- {key: value}
- key: value
  other: value
- items:
    - ordinary
`,
      { yamlSequenceOnNewLine: true },
    )

    expect(formatted).toBe(`\
- scalar
- [ one, two ]
- { key: value }
- key: value
  other: value
- items:
  - ordinary
`)
  })

  it('preserves comments, anchors, and tags before nested block sequences', async () => {
    const formatted = await format(
      `
- # item comment
  - one
  - two
- &items
  - three
  - four
- !custom
  - five
  - six
`,
      { yamlSequenceOnNewLine: true },
    )

    expect(formatted).toBe(`\
- # item comment
  - one
  - two
- &items
  - three
  - four
- !custom
  - five
  - six
`)
  })

  it.each([
    {
      expected: `\
-
  -
    one
  - two
`,
      yamlKeepLineBreaks: true,
    },
    {
      expected: `\
-
  - one
  - two
`,
      yamlKeepLineBreaks: false,
    },
  ])(
    'works with yamlKeepLineBreaks=$yamlKeepLineBreaks',
    async ({ expected, yamlKeepLineBreaks }) => {
      const formatted = await format(
        `
- -
    one
  - two
`,
        { yamlKeepLineBreaks, yamlSequenceOnNewLine: true },
      )

      expect(formatted).toBe(expected)
    },
  )

  it('is idempotent', async () => {
    const input = `\
root:
-
  - one
  -
    - two
    - three
`
    const options = { yamlSequenceOnNewLine: true }
    const once = await format(input, options)
    const twice = await format(once, options)

    expect(twice).toBe(once)
  })
})

describe('yamlKeepLineBreaks: true (default)', () => {
  it('preserves a source line break before a scalar mapping value', async () => {
    const formatted = await format(`
key:
  value
same_line: value
single:
  'quoted value'
double:
  "quoted value"
`)

    expect(formatted).toBe(`\
key:
  value
same_line: value
single:
  "quoted value"
double:
  "quoted value"
`)
  })

  it('preserves nested mapping values, including mappings in sequences', async () => {
    const formatted = await format(`
root:
  child:
    nested value
items:
  - key:
      item value
`)

    expect(formatted).toBe(`\
root:
  child:
    nested value
items:
- key:
    item value
`)
  })

  it('preserves a source line break before a scalar sequence item', async () => {
    const formatted = await format(`
items:
  -
    first
  - second
`)

    expect(formatted).toBe(`\
items:
-
  first
- second
`)
  })

  it('uses native formatting for comments and block scalars', async () => {
    const formatted = await format(`
before: # stays with the key
  commented value
after:
  value # stays with the value
items:
  - # stays with the item
    sequence value
block:
  |
    first
    second
`)

    expect(formatted).toBe(`\
before: # stays with the key
  commented value
after:
  value # stays with the value
items:
- # stays with the item
  sequence value
block: |
  first
  second
`)
  })

  it('normalizes indentation, trailing spaces, and scalar continuation lines', async () => {
    const input =
      'key:\n          value   \nwrapped:\n  one two\n  three four\n'
    const formatted = await format(input)

    expect(formatted).toBe(`\
key:
  value
wrapped:
  one two
  three four
`)
  })

  it('leaves collection wrapping to printWidth', async () => {
    const formatted = await format(
      `
value:
  [one, two, three, four]
`,
      { printWidth: 20 },
    )

    expect(formatted).toBe(`\
value:
  [
    one,
    two,
    three,
    four,
  ]
`)
  })

  it.each([
    {
      expected: `\
items:
-
  scalar
- key:
    value
`,
      yamlIndentSequenceValue: false,
    },
    {
      expected: `\
items:
  -
    scalar
  - key:
      value
`,
      yamlIndentSequenceValue: true,
    },
  ])(
    'works with yamlIndentSequenceValue=$yamlIndentSequenceValue',
    async ({ expected, yamlIndentSequenceValue }) => {
      const formatted = await format(
        `
items:
  -
    scalar
  - key:
      value
`,
        { yamlIndentSequenceValue },
      )

      expect(formatted).toBe(expected)
    },
  )

  it('is idempotent', async () => {
    const input = `\
root:
  value
items:
-
  scalar
- key:
    nested value
`
    const once = await format(input)
    const twice = await format(once)

    expect(twice).toBe(once)
  })
})

describe('yamlKeepLineBreaks: false', () => {
  it("uses Prettier's native scalar collapsing behavior", async () => {
    const formatted = await format(
      `
root:
  child:
    value
items:
  -
    scalar
  - key:
      item value
`,
      { yamlKeepLineBreaks: false },
    )

    expect(formatted).toBe(`\
root:
  child: value
items:
- scalar
- key: item value
`)
  })
})

describe('yamlLineCommentAddSpaceOnReformat', () => {
  it('preserves current comment text by default', async () => {
    const formatted = await format(`\
#standalone
key: value #inline
`)

    expect(formatted).toBe(`\
#standalone
key: value #inline
`)
  })

  it('adds a space to standalone and inline comments when enabled', async () => {
    const formatted = await format(
      `\
#standalone
key: value #inline
`,
      { yamlLineCommentAddSpaceOnReformat: true },
    )

    expect(formatted).toBe(`\
# standalone
key: value # inline
`)
  })

  it('keeps spaced and bare comments and preserves native blank formatting', async () => {
    const formatted = await format('# spaced\n#\n#   \nkey: value # spaced\n', {
      yamlLineCommentAddSpaceOnReformat: true,
    })

    expect(formatted).toBe(`\
# spaced
#
#
key: value # spaced
`)
  })

  it('does not change hashes in scalar content', async () => {
    const formatted = await format(
      `\
plain: value#fragment
double: "#quoted"
single: '#quoted'
literal: |
  #block scalar
  value#fragment
folded: >
  #block scalar
  value#fragment
`,
      { yamlLineCommentAddSpaceOnReformat: true },
    )

    expect(formatted).toBe(`\
plain: value#fragment
double: "#quoted"
single: "#quoted"
literal: |
  #block scalar
  value#fragment
folded: >
  #block scalar
  value#fragment
`)
  })

  it('only changes comment nodes around directives, anchors, and tags', async () => {
    const formatted = await format(
      `\
%YAML 1.2
---
defaults: &defaults
  tagged: !custom value
reference: *defaults
#document comment
`,
      { yamlLineCommentAddSpaceOnReformat: true },
    )

    expect(formatted).toBe(`\
%YAML 1.2
---
defaults: &defaults
  tagged: !custom value
reference: *defaults
# document comment
`)
  })

  it('handles nested mappings, sequences, and preserved line breaks', async () => {
    const formatted = await format(
      `\
before: #key comment
  commented value
root:
  #nested comment
  child:
    nested value
items:
  - #item comment
    sequence value
  - scalar #inline item comment
`,
      {
        yamlKeepLineBreaks: true,
        yamlLineCommentAddSpaceOnReformat: true,
      },
    )

    expect(formatted).toBe(`\
before: # key comment
  commented value
root:
  # nested comment
  child:
    nested value
items:
- # item comment
  sequence value
- scalar # inline item comment
`)
  })

  it('normalizes ordinary suppression comment nodes without changing semantics', async () => {
    const formatted = await format(
      `\
#prettier-ignore
ignored:   [a,b]
`,
      { yamlLineCommentAddSpaceOnReformat: true },
    )

    expect(formatted).toBe(`\
# prettier-ignore
ignored:   [a,b]
`)
  })

  it('is idempotent', async () => {
    const input = `\
#standalone
root:
  child: value #inline
`
    const options = { yamlLineCommentAddSpaceOnReformat: true }
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
