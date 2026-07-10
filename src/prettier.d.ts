// SPDX-FileCopyrightText: 2026 Daniel Morris <daniel@honestempire.com>
// SPDX-License-Identifier: MIT

export interface YamlPluginOptions {
  yamlAlignValuesProperties?: 'do_not_align' | 'on_colon' | 'on_value'
  yamlBlockMappingOnNewLine?: boolean
  yamlIndentSequenceValue?: boolean
  yamlSpacesWithinBraces?: boolean
  yamlSpacesWithinBrackets?: boolean
}

declare module 'prettier' {
  // Module augmentation requires mergeable interface declarations.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Options extends YamlPluginOptions {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ParserOptions extends YamlPluginOptions {}
}
