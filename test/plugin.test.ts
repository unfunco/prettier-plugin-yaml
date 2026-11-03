// SPDX-FileCopyrightText: 2026 Daniel Morris <daniel@honestempire.com>
// SPDX-License-Identifier: MIT

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import prettier from 'prettier'
import * as builtinYamlPlugin from 'prettier/plugins/yaml'

import plugin from '../src/index.ts'

async function format(text: string, options: Record<string, unknown> = {}) {
  return prettier.format(text, {
    parser: 'yaml',
    plugins: [builtinYamlPlugin, plugin],
    ...options,
  })
}

void describe('yamlAlignValuesProperties', () => {
  void it('does not align properties by default', async () => {
    const formatted = await format(`
a     : one
longer:  two
`)

    assert.equal(
      formatted,
      `\
a: one
longer: two
`,
    )
  })

  void it('aligns colons across sibling block mapping entries', async () => {
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

    assert.equal(
      formatted,
      `\
a     : one
longer: two
mid   : three
group :
  child: value
`,
    )
  })

  void it('aligns scalar values across sibling block mapping entries', async () => {
    const formatted = await format(
      `
a: one
longer: two
mid: three
`,
      { yamlAlignValuesProperties: 'on_value' },
    )

    assert.equal(
      formatted,
      `\
a:      one
longer: two
mid:    three
`,
    )
  })

  void it('keeps nested mapping alignment isolated', async () => {
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

    assert.equal(
      formatted,
      `\
a:    one
long: two
nested:
  x:      one
  longer: two
z:    three
`,
    )
  })

  void it('does not align flow mappings or multiline scalar bodies', async () => {
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

    assert.equal(
      formatted,
      `\
a:    one
long: two
very_long_flow: { short: x, longer: y }
lit:  |
  body: stays
`,
    )
  })

  for (const yamlAlignValuesProperties of ['on_colon', 'on_value']) {
    void it(`is idempotent with ${yamlAlignValuesProperties}`, async () => {
      const input = `\
a: one
longer: two
nested:
  x: three
  longest: four
`
      const once = await format(input, { yamlAlignValuesProperties })
      const twice = await format(once, { yamlAlignValuesProperties })

      assert.equal(twice, once)
    })
  }
})

void describe('yamlSpaceBeforeColon', () => {
  void it('uses native no-space mapping separators by default', async () => {
    const formatted = await format(`
block : value
flow: { key : value, other: next }
`)

    assert.equal(
      formatted,
      `\
block: value
flow: { key: value, other: next }
`,
    )
  })

  void it('adds one space before block mapping colons', async () => {
    const formatted = await format(
      `
short: one
longer: two
empty:
explicit: null
`,
      { yamlSpaceBeforeColon: true },
    )

    assert.equal(
      formatted,
      `\
short : one
longer : two
empty :
explicit : null
`,
    )
  })

  void it('adds one space before flow mapping colons', async () => {
    const formatted = await format(
      `
{key: value, nested: {inner: true}, list: [{x: y}]}
`,
      { printWidth: 40, yamlSpaceBeforeColon: true },
    )

    assert.equal(
      formatted,
      `\
{
  key : value,
  nested : { inner : true },
  list : [ { x : y } ],
}
`,
    )
  })

  void it('handles nested mappings and mappings in sequences', async () => {
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

    assert.equal(
      formatted,
      `\
root :
  child : value
items :
  - name : first
    data : { key : value }
`,
    )
  })

  void it('handles quoted and compact complex mapping keys', async () => {
    const formatted = await format(
      `
"quoted:key": value
'other:key': next
? [a, b]
: complex
`,
      { yamlSpaceBeforeColon: true },
    )

    assert.equal(
      formatted,
      `\
"quoted:key" : value
"other:key" : next
[ a, b ] : complex
`,
    )
  })

  void it('does not alter colon content or YAML structural markers', async () => {
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

    assert.equal(
      formatted,
      `\
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
`,
    )
  })

  void it('aligns colons with a base space before every separator', async () => {
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

    assert.equal(
      formatted,
      `\
a      : one
longer : two
`,
    )
  })

  void it('aligns value starts while adding the pre-colon space', async () => {
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

    assert.equal(
      formatted,
      `\
a :      one
longer : two
`,
    )
  })

  void it('preserves source line breaks before simple scalar values', async () => {
    const formatted = await format(
      `
short:
  value
longer: inline
`,
      { yamlSpaceBeforeColon: true },
    )

    assert.equal(
      formatted,
      `\
short :
  value
longer : inline
`,
    )
  })

  void it('keeps wrapped explicit mapping separators valid', async () => {
    const formatted = await format(
      `
? [a-very-long-complex-key-part, another-long-complex-key-part]
: value
`,
      { printWidth: 30, yamlSpaceBeforeColon: true },
    )

    assert.equal(
      formatted,
      `\
? [
    a-very-long-complex-key-part,
    another-long-complex-key-part,
  ]
: value
`,
    )
    assert.equal(await format(formatted, { printWidth: 30 }), formatted)
  })

  for (const yamlAlignValuesProperties of [
    'do_not_align',
    'on_colon',
    'on_value',
  ] as const) {
    void it(`is idempotent with ${yamlAlignValuesProperties} alignment`, async () => {
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

      assert.equal(twice, once)
    })
  }
})

void describe('yamlBlockMappingOnNewLine', () => {
  void it('keeps block sequence mappings inline by default', async () => {
    const formatted = await format(`
- key: value
  other: value
`)

    assert.equal(
      formatted,
      `\
- key: value
  other: value
`,
    )
  })

  void it('puts top-level sequence mappings on a new line', async () => {
    const formatted = await format(
      `
- key: value
  other: value
`,
      { yamlBlockMappingOnNewLine: true },
    )

    assert.equal(
      formatted,
      `\
-
  key: value
  other: value
`,
    )
  })

  void it('uses the configured indentation for nested sequence mappings', async () => {
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

    assert.equal(
      formatted,
      `\
root:
    -
        name: parent
        children:
            -
                name: child
                enabled: true
`,
    )
  })

  void it('does not change ordinary mappings or non-mapping sequence items', async () => {
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

    assert.equal(
      formatted,
      `\
metadata:
  owner:
    name: team
items:
- scalar
- { key: value }
`,
    )
  })

  void it('works with unindented mapping sequence values', async () => {
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

    assert.equal(
      formatted,
      `\
root:
-
  key: value
  other: value
`,
    )
  })

  void it('preserves comments, anchors, and tags before mappings', async () => {
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

    assert.equal(
      formatted,
      `\
- # item comment
  key: value
- &defaults
  first: value
  second: value
- !custom
  tagged: value
`,
    )
  })

  void it('preserves mapping value alignment', async () => {
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

    assert.equal(
      formatted,
      `\
-
  short:       one
  much_longer: two
`,
    )
  })

  void it('is idempotent', async () => {
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

    assert.equal(twice, once)
  })
})

void describe('yamlSequenceOnNewLine', () => {
  void it('keeps nested block sequences inline by default', async () => {
    const formatted = await format(`
- - one
  - two
`)

    assert.equal(
      formatted,
      `\
- - one
  - two
`,
    )
  })

  void it('puts multiple top-level nested block sequences on new lines', async () => {
    const formatted = await format(
      `
- - one
  - two
- - three
  - four
`,
      { yamlSequenceOnNewLine: true },
    )

    assert.equal(
      formatted,
      `\
-
  - one
  - two
-
  - three
  - four
`,
    )
  })

  void it('puts recursively nested block sequences on new lines', async () => {
    const formatted = await format(
      `
root:
  - - first
    - - second
      - third
`,
      { yamlSequenceOnNewLine: true },
    )

    assert.equal(
      formatted,
      `\
root:
-
  - first
  -
    - second
    - third
`,
    )
  })

  void it('uses the configured indentation', async () => {
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

    assert.equal(
      formatted,
      `\
root:
    -
        - one
        - two
`,
    )
  })

  for (const { expected, yamlIndentSequenceValue } of [
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
  ]) {
    void it(`works with yamlIndentSequenceValue=${String(yamlIndentSequenceValue)}`, async () => {
      const formatted = await format(
        `
root:
  - - one
    - two
`,
        { yamlIndentSequenceValue, yamlSequenceOnNewLine: true },
      )

      assert.equal(formatted, expected)
    })
  }

  void it('works independently from yamlBlockMappingOnNewLine', async () => {
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

    assert.equal(
      formatted,
      `\
-
  - one
  - two
-
  key: value
  other: value
`,
    )
  })

  void it('does not change scalar, flow collection, mapping, or ordinary sequence values', async () => {
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

    assert.equal(
      formatted,
      `\
- scalar
- [ one, two ]
- { key: value }
- key: value
  other: value
- items:
  - ordinary
`,
    )
  })

  void it('preserves comments, anchors, and tags before nested block sequences', async () => {
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

    assert.equal(
      formatted,
      `\
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
    )
  })

  for (const { expected, yamlKeepLineBreaks } of [
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
  ]) {
    void it(`works with yamlKeepLineBreaks=${String(yamlKeepLineBreaks)}`, async () => {
      const formatted = await format(
        `
- -
    one
  - two
`,
        { yamlKeepLineBreaks, yamlSequenceOnNewLine: true },
      )

      assert.equal(formatted, expected)
    })
  }

  void it('is idempotent', async () => {
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

    assert.equal(twice, once)
  })
})

void describe('yamlKeepLineBreaks: true (default)', () => {
  void it('preserves a source line break before a scalar mapping value', async () => {
    const formatted = await format(`
key:
  value
same_line: value
single:
  'quoted value'
double:
  "quoted value"
`)

    assert.equal(
      formatted,
      `\
key:
  value
same_line: value
single:
  "quoted value"
double:
  "quoted value"
`,
    )
  })

  void it('preserves nested mapping values, including mappings in sequences', async () => {
    const formatted = await format(`
root:
  child:
    nested value
items:
  - key:
      item value
`)

    assert.equal(
      formatted,
      `\
root:
  child:
    nested value
items:
- key:
    item value
`,
    )
  })

  void it('preserves a source line break before a scalar sequence item', async () => {
    const formatted = await format(`
items:
  -
    first
  - second
`)

    assert.equal(
      formatted,
      `\
items:
-
  first
- second
`,
    )
  })

  void it('uses native formatting for comments and block scalars', async () => {
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

    assert.equal(
      formatted,
      `\
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
`,
    )
  })

  void it('normalizes indentation, trailing spaces, and scalar continuation lines', async () => {
    const input =
      'key:\n          value   \nwrapped:\n  one two\n  three four\n'
    const formatted = await format(input)

    assert.equal(
      formatted,
      `\
key:
  value
wrapped:
  one two
  three four
`,
    )
  })

  void it('leaves collection wrapping to printWidth', async () => {
    const formatted = await format(
      `
value:
  [one, two, three, four]
`,
      { printWidth: 20 },
    )

    assert.equal(
      formatted,
      `\
value:
  [
    one,
    two,
    three,
    four,
  ]
`,
    )
  })

  for (const { expected, yamlIndentSequenceValue } of [
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
  ]) {
    void it(`works with yamlIndentSequenceValue=${String(yamlIndentSequenceValue)}`, async () => {
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

      assert.equal(formatted, expected)
    })
  }

  void it('is idempotent', async () => {
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

    assert.equal(twice, once)
  })
})

void describe('yamlKeepLineBreaks: false', () => {
  void it("uses Prettier's native scalar collapsing behavior", async () => {
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

    assert.equal(
      formatted,
      `\
root:
  child: value
items:
- scalar
- key: item value
`,
    )
  })
})

void describe('yamlLineCommentAddSpaceOnReformat', () => {
  void it('preserves current comment text by default', async () => {
    const formatted = await format(`\
#standalone
key: value #inline
`)

    assert.equal(
      formatted,
      `\
#standalone
key: value #inline
`,
    )
  })

  void it('adds a space to standalone and inline comments when enabled', async () => {
    const formatted = await format(
      `\
#standalone
key: value #inline
`,
      { yamlLineCommentAddSpaceOnReformat: true },
    )

    assert.equal(
      formatted,
      `\
# standalone
key: value # inline
`,
    )
  })

  void it('keeps spaced and bare comments and preserves native blank formatting', async () => {
    const formatted = await format('# spaced\n#\n#   \nkey: value # spaced\n', {
      yamlLineCommentAddSpaceOnReformat: true,
    })

    assert.equal(
      formatted,
      `\
# spaced
#
#
key: value # spaced
`,
    )
  })

  void it('does not change hashes in scalar content', async () => {
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

    assert.equal(
      formatted,
      `\
plain: value#fragment
double: "#quoted"
single: "#quoted"
literal: |
  #block scalar
  value#fragment
folded: >
  #block scalar
  value#fragment
`,
    )
  })

  void it('only changes comment nodes around directives, anchors, and tags', async () => {
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

    assert.equal(
      formatted,
      `\
%YAML 1.2
---
defaults: &defaults
  tagged: !custom value
reference: *defaults
# document comment
`,
    )
  })

  void it('handles nested mappings, sequences, and preserved line breaks', async () => {
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

    assert.equal(
      formatted,
      `\
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
`,
    )
  })

  void it('normalizes ordinary suppression comment nodes without changing semantics', async () => {
    const formatted = await format(
      `\
#prettier-ignore
ignored:   [a,b]
`,
      { yamlLineCommentAddSpaceOnReformat: true },
    )

    assert.equal(
      formatted,
      `\
# prettier-ignore
ignored:   [a,b]
`,
    )
  })

  void it('is idempotent', async () => {
    const input = `\
#standalone
root:
  child: value #inline
`
    const options = { yamlLineCommentAddSpaceOnReformat: true }
    const once = await format(input, options)
    const twice = await format(once, options)

    assert.equal(twice, once)
  })
})

void describe('yamlIndentSequenceValue: false (default)', () => {
  void it('unindents top-level sequence values', async () => {
    const formatted = await format(`
property:
  - object_one: 1
    object_one_property_two: 2
  - object_two: 2
    object_two_property_two: 2
`)

    assert.equal(
      formatted,
      `\
property:
- object_one: 1
  object_one_property_two: 2
- object_two: 2
  object_two_property_two: 2
`,
    )
  })

  void it('unindents nested sequence values', async () => {
    const formatted = await format(`
root:
  - name: one
    attrs:
      - a
      - b
`)

    assert.equal(
      formatted,
      `\
root:
- name: one
  attrs:
  - a
  - b
`,
    )
  })

  void it('only removes the mapping indent that belongs to the sequence value', async () => {
    const formatted = await format(`
root:
  - child:
      nested:
        key: value
      list:
        - 1
        - 2
`)

    assert.equal(
      formatted,
      `\
root:
- child:
    nested:
      key: value
    list:
    - 1
    - 2
`,
    )
  })

  void it('keeps sequence comments aligned with the sequence', async () => {
    const formatted = await format(`
property:
  # comment
  - a
`)

    assert.equal(
      formatted,
      `\
property:
# comment
- a
`,
    )
  })
})

void describe('yamlIndentSequenceValue: true', () => {
  void it("preserves Prettier's native indented sequence output", async () => {
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

    assert.equal(
      formatted,
      `\
property:
  - object_one: 1
    object_one_property_two: 2
  - object_two: 2
    object_two_property_two: 2
`,
    )
  })
})

void describe('yamlSpacesWithinBrackets: true (default)', () => {
  void it('adds spaces inside flow sequences by default', async () => {
    const formatted = await format(
      `
property: [verify]
`,
    )

    assert.equal(formatted, 'property: [ verify ]\n')
  })

  void it('adds spaces inside empty flow sequences by default', async () => {
    const formatted = await format(
      `
property: []
`,
    )

    assert.equal(formatted, 'property: [ ]\n')
  })

  void it('adds spaces to multi-line flow sequences after flattening by default', async () => {
    const formatted = await format(
      `
key:
  [
    a,
    b
  ]
`,
    )

    assert.equal(
      formatted,
      `\
key: [ a, b ]
`,
    )
  })

  void it('can disable spaces inside flow sequences', async () => {
    const formatted = await format(
      `
property: [ verify ]
`,
      { yamlSpacesWithinBrackets: false },
    )

    assert.equal(formatted, 'property: [verify]\n')
  })
})

void describe('yamlSpacesWithinBraces: true (default)', () => {
  void it('adds spaces inside empty flow mappings by default', async () => {
    const formatted = await format(
      `
property: {}
`,
    )

    assert.equal(formatted, 'property: { }\n')
  })

  void it('overrides bracketSpacing=false for flow mappings by default', async () => {
    const formatted = await format(
      `
property: {a: 1}
`,
      { bracketSpacing: false },
    )

    assert.equal(formatted, 'property: { a: 1 }\n')
  })

  void it('can disable spaces inside flow mappings independent of bracketSpacing', async () => {
    const formatted = await format(
      `
property: { a: 1 }
`,
      { yamlSpacesWithinBraces: false },
    )

    assert.equal(formatted, 'property: {a: 1}\n')
  })
})

void describe('split flow collection spacing options', () => {
  void it('spaces braces without spacing brackets', async () => {
    const formatted = await format(
      `
property: [{}, [a]]
`,
      { yamlSpacesWithinBrackets: false },
    )

    assert.equal(formatted, 'property: [{ }, [a]]\n')
  })

  void it('spaces brackets without spacing braces', async () => {
    const formatted = await format(
      `
property: [{}, [a]]
`,
      { yamlSpacesWithinBraces: false },
    )

    assert.equal(formatted, 'property: [ {}, [ a ] ]\n')
  })
})
