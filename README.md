# YAML plugin for Prettier

[![CI](https://github.com/unfunco/prettier-plugin-yaml/actions/workflows/ci.yaml/badge.svg)](https://github.com/unfunco/prettier-plugin-yaml/actions/workflows/ci.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)

> [!NOTE]
> 🤖 Developed with AI assistance.

A YAML plugin for Prettier that prevents the indentation of sequence values and
can optionally add spaces inside flow collection delimiters. This plugin allows
you to control whether list items are indented relative to their parent key and
whether flow collections stay spaced, providing cleaner YAML configurations for
tools like GitHub Actions, Kubernetes, and Ansible.

## Getting started

### Installation and usage

```bash
npm install --save-dev prettier @unfunco/prettier-plugin-yaml
```

## Usage

Add the plugin to your Prettier configuration file:

```json
{
  "plugins": ["@unfunco/prettier-plugin-yaml"]
}
```

|              JetBrains EditorConfig property |      Prettier plugin       | Default |
| -------------------------------------------: | :------------------------: | :-----: |
|            `ij_yaml_align_values_properties` |            TODO            |  TODO   |
|         `ij_yaml_autoinsert_sequence_marker` |            TODO            |  TODO   |
|          `ij_yaml_block_mapping_on_new_line` |            TODO            |  TODO   |
|              `ij_yaml_indent_sequence_value` | `yamlIndentSequenceValue`  | `false` |
|                        `ij_yaml_indent_size` |            TODO            |  TODO   |
|        `ij_yaml_keep_indents_on_empty_lines` |            TODO            |  TODO   |
|                   `ij_yaml_keep_line_breaks` |            TODO            |  TODO   |
|             `ij_yaml_line_comment_add_space` |            TODO            |  TODO   |
| `ij_yaml_line_comment_add_space_on_reformat` |            TODO            |  TODO   |
|       `ij_yaml_line_comment_at_first_column` |            TODO            |  TODO   |
|               `ij_yaml_sequence_on_new_line` |            TODO            |  TODO   |
|                 `ij_yaml_space_before_colon` |            TODO            |  TODO   |
|               `ij_yaml_spaces_within_braces` |  `yamlSpacesWithinBraces`  | `true`  |
|             `ij_yaml_spaces_within_brackets` | `yamlSpacesWithinBrackets` | `true`  |

## License

© 2023 [Daniel Morris]\
Made available under the terms of the [MIT License].

[daniel morris]: https://unfun.co
[mit license]: LICENSE.md
