# YAML plugin for Prettier

[![CI](https://github.com/unfunco/prettier-plugin-yaml/actions/workflows/ci.yaml/badge.svg)](https://github.com/unfunco/prettier-plugin-yaml/actions/workflows/ci.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)

> [!WARNING]
> 🤖 This is pretty much entirely vibe-coded with Copilot.

Yet another YAML plugin for Prettier. I got so attached to the way JetBrains
IDEs format YAML that I couldn't bear to look at anything else. Indented
sequence values? No fucking thanks.

I've only implemented enough to get the formatting I want, and by "I've", I
mean I asked Copilot to do it. It runs before commits, so the stakes are low.
It does what I want.

## Install

```bash
npm install --save-dev prettier @unfunco/prettier-plugin-yaml
```

## Usage

Add the plugin to your Prettier configuration. Set whichever options differ
from the defaults:

```json
{
  "plugins": ["@unfunco/prettier-plugin-yaml"],
  "yamlAlignValuesProperties": "on_value",
  "yamlBlockMappingOnNewLine": false,
  "yamlIndentSequenceValue": false,
  "yamlLineCommentAddSpaceOnReformat": false,
  "yamlSequenceOnNewLine": false,
  "yamlSpaceBeforeColon": false,
  "yamlSpacesWithinBraces": true,
  "yamlSpacesWithinBrackets": true
}
```

|              JetBrains EditorConfig property |           Prettier plugin           |    Default     |
| -------------------------------------------: | :---------------------------------: | :------------: |
|            `ij_yaml_align_values_properties` |     `yamlAlignValuesProperties`     | `do_not_align` |
|         `ij_yaml_autoinsert_sequence_marker` |           Not applicable            |     `true`     |
|          `ij_yaml_block_mapping_on_new_line` |     `yamlBlockMappingOnNewLine`     |    `false`     |
|              `ij_yaml_indent_sequence_value` |      `yamlIndentSequenceValue`      |    `false`     |
|                        `ij_yaml_indent_size` |             `tabWidth`              |      `2`       |
|        `ij_yaml_keep_indents_on_empty_lines` |           Not applicable            |    `false`     |
|                   `ij_yaml_keep_line_breaks` |        `yamlKeepLineBreaks`         |     `true`     |
|             `ij_yaml_line_comment_add_space` |           Not applicable            |    `false`     |
| `ij_yaml_line_comment_add_space_on_reformat` | `yamlLineCommentAddSpaceOnReformat` |    `false`     |
|       `ij_yaml_line_comment_at_first_column` |           Not applicable            |     `true`     |
|               `ij_yaml_sequence_on_new_line` |       `yamlSequenceOnNewLine`       |    `false`     |
|                 `ij_yaml_space_before_colon` |       `yamlSpaceBeforeColon`        |    `false`     |
|               `ij_yaml_spaces_within_braces` |      `yamlSpacesWithinBraces`       |     `true`     |
|             `ij_yaml_spaces_within_brackets` |     `yamlSpacesWithinBrackets`      |     `true`     |

`ij_yaml_indent_size` maps to Prettier's standard `tabWidth` option, which
defaults to `2`. No YAML-specific option is needed.

`ij_yaml_autoinsert_sequence_marker` controls whether JetBrains adds a hyphen
when you press Enter for the next sequence item. That's typing behaviour, not
formatting, so there is no Prettier option for it.

`ij_yaml_keep_indents_on_empty_lines` controls whitespace on otherwise empty
lines. Prettier removes trailing whitespace from blank lines, and the plugin
shouldn't put it back. There is no Prettier option for it.

`ij_yaml_line_comment_add_space` controls whether JetBrains adds a space after
the comment marker when you comment or uncomment a line. That's editor
behaviour, not formatter behaviour, so there is no Prettier option for it.
Reformat-time comment spacing is controlled separately by
`ij_yaml_line_comment_add_space_on_reformat`.

`ij_yaml_line_comment_at_first_column` controls whether JetBrains puts the
comment marker in column one or at the code indentation. Prettier structurally
indents existing YAML comments instead, so there is no Prettier option for it.

## Options

### `yamlAlignValuesProperties`

Controls how sibling block-mapping properties align:

- `do_not_align` (default) uses normal YAML spacing.
- `on_colon` aligns mapping colons.
- `on_value` aligns the start of scalar values.

### `yamlBlockMappingOnNewLine`

Controls whether a block mapping used as a sequence item starts on the line after
the sequence marker. The default is `false`.

### `yamlSequenceOnNewLine`

Controls whether a block sequence used as a sequence item starts on the line after
the parent sequence marker. The default is `false`.

### `yamlKeepLineBreaks`

Preserves a source line break before a simple plain or quoted scalar mapping
value, including nested mappings and mappings in sequences. It also preserves
the equivalent break before a simple scalar sequence item. The default is
`true`; set it to `false` to let Prettier collapse them.

This option does not retain source indentation, trailing whitespace, or arbitrary
collection layout. Scalar continuation wrapping, comments, and block scalars use
Prettier's normal YAML handling. `printWidth` still decides when lines wrap.

### `yamlLineCommentAddSpaceOnReformat`

Adds one space after `#` when a standalone or inline YAML comment starts right
after the marker. The default is `false`, which leaves Prettier's current comment
text alone.

It only transforms YAML comment AST nodes, so hash characters in plain or quoted
scalars and block scalar content stay unchanged. Prettier represents suppression
comments as ordinary YAML comment nodes; when enabled, this also spaces unspaced
suppression comments without changing their content or meaning.

### `yamlSpaceBeforeColon`

Adds one space before mapping colons in block and flow mappings. The default is
`false`, which uses Prettier's normal `key: value` spacing. Alignment still
applies when enabled: `on_colon` aligns colons with at least one pre-colon space,
and `on_value` aligns value starts after adding that space.

Only mapping key separators change. Colons in scalar content, tags, anchors,
directives, and document markers stay unchanged.

## License

© 2023 [Daniel Morris]\
Made available under the terms of the [MIT License].

[daniel morris]: https://unfun.co
[mit license]: LICENSE.md
