# YAML plugin for Prettier

[![CI](https://github.com/unfunco/prettier-plugin-yaml/actions/workflows/ci.yaml/badge.svg)](https://github.com/unfunco/prettier-plugin-yaml/actions/workflows/ci.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)

> [!NOTE]
> 🤖 Developed with AI assistance.

Yet another YAML plugin for Prettier. This exists because I got so attached to
the way JetBrains IDEs format YAML that I couldn't bear to look at anything
else. Indented sequence values? No fucking thanks. I've really only implemented
enough to get the formatting I want, and when I say "I've," I mean I asked
Copilot to do it. This is mostly vibe-coded. It's a YAML formatter that runs
before committing, so the stakes are low. It does what I want it to.

## Getting started

### Installation and usage

```bash
npm install --save-dev prettier @unfunco/prettier-plugin-yaml
```

## Usage

Add the plugin to your Prettier configuration file and configure the options as
desired if they differ from the defaults.

```json
{
  "plugins": ["@unfunco/prettier-plugin-yaml"],
  "yamlAlignValuesProperties": "on_value",
  "yamlBlockMappingOnNewLine": false,
  "yamlIndentSequenceValue": false,
  "yamlSpacesWithinBraces": true,
  "yamlSpacesWithinBrackets": true
}
```

|              JetBrains EditorConfig property |       Prettier plugin       |    Default     |
| -------------------------------------------: | :-------------------------: | :------------: |
|            `ij_yaml_align_values_properties` | `yamlAlignValuesProperties` | `do_not_align` |
|         `ij_yaml_autoinsert_sequence_marker` |       Not applicable        |     `true`     |
|          `ij_yaml_block_mapping_on_new_line` | `yamlBlockMappingOnNewLine` |    `false`     |
|              `ij_yaml_indent_sequence_value` |  `yamlIndentSequenceValue`  |    `false`     |
|                        `ij_yaml_indent_size` |            TODO             |      TODO      |
|        `ij_yaml_keep_indents_on_empty_lines` |            TODO             |      TODO      |
|                   `ij_yaml_keep_line_breaks` |            TODO             |      TODO      |
|             `ij_yaml_line_comment_add_space` |            TODO             |      TODO      |
| `ij_yaml_line_comment_add_space_on_reformat` |            TODO             |      TODO      |
|       `ij_yaml_line_comment_at_first_column` |            TODO             |      TODO      |
|               `ij_yaml_sequence_on_new_line` |            TODO             |      TODO      |
|                 `ij_yaml_space_before_colon` |            TODO             |      TODO      |
|               `ij_yaml_spaces_within_braces` |  `yamlSpacesWithinBraces`   |     `true`     |
|             `ij_yaml_spaces_within_brackets` | `yamlSpacesWithinBrackets`  |     `true`     |

`ij_yaml_autoinsert_sequence_marker` controls whether JetBrains editors insert a
hyphen when Enter is pressed for a subsequent sequence item. This is interactive
typing behavior, not document formatting, so it has no Prettier plugin option.

## Options

### `yamlAlignValuesProperties`

Controls alignment of sibling block mapping properties:

- `do_not_align` (default) uses normal YAML spacing.
- `on_colon` aligns mapping colons.
- `on_value` aligns the start of scalar values.

### `yamlBlockMappingOnNewLine`

Controls whether a block mapping used as a sequence item starts on the line after
the sequence marker. The default is `false`.

## License

© 2023 [Daniel Morris]\
Made available under the terms of the [MIT License].

[daniel morris]: https://unfun.co
[mit license]: LICENSE.md
