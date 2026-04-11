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

This plugin disables indentation for sequence values in YAML files by default.
To enable indentation, set the `yamlIndentSequenceValues` option to `true`:

```json
{
  "yamlIndentSequenceValues": true
}
```

To put spaces inside YAML flow collections, set
`yamlFlowCollectionSpacing` to `true`:

```json
{
  "yamlFlowCollectionSpacing": true
}
```

This formats flow collections like `[ verify ]`, `[ ]`, and `{ }`.

## License

© 2023 [Daniel Morris]\
Made available under the terms of the [MIT License].

[daniel morris]: https://unfun.co
[mit license]: LICENSE.md
