// SPDX-FileCopyrightText: 2026 Daniel Morris <daniel@honestempire.com>
// SPDX-License-Identifier: MIT

import type { Plugin } from 'prettier'
import { parsers } from 'prettier/plugins/yaml'

import { options } from './options.ts'
import { printer } from './printer.ts'

export type { YamlPluginOptions } from './options.ts'

// Prettier picks a printer by the parser's `astFormat`, so the built-in YAML
// parser is re-registered under a format that this plugin's printer handles.
const astFormat = 'yaml-unindented-sequences'

const plugin: Plugin = {
  options,
  parsers: {
    yaml: { ...parsers.yaml, astFormat },
  },
  printers: {
    [astFormat]: printer,
  },
}

export default plugin
