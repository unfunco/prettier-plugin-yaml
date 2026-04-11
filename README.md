# YAML plugin for Prettier

[![CI](https://github.com/unfunco/prettier-plugin-yaml/actions/workflows/ci.yaml/badge.svg)](https://github.com/unfunco/prettier-plugin-yaml/actions/workflows/ci.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)

> [!NOTE]
> 🤖 Developed with AI assistance.

A YAML plugin for Prettier that prevents the indentation of sequence values and
aligns YAML flow collection spacing with JetBrains IDE defaults. This plugin
lets you control whether list items are indented relative to their parent key
and whether flow mappings or flow sequences keep spaces inside their
delimiters, providing cleaner YAML configurations for tools like GitHub
Actions, Kubernetes, and Ansible.

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

|  JetBrains EditorConfig property |      Prettier plugin       | Default |
| -------------------------------: | :------------------------: | :-----: |
|  `ij_yaml_indent_sequence_value` | `yamlIndentSequenceValues` | `false` |
|   `ij_yaml_spaces_within_braces` |  `yamlSpacesWithinBraces`  | `true`  |
| `ij_yaml_spaces_within_brackets` | `yamlSpacesWithinBrackets` | `true`  |

## License

© 2023 [Daniel Morris]\
Made available under the terms of the [MIT License].

[daniel morris]: https://unfun.co
[mit license]: LICENSE.md
