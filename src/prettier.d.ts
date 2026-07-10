// SPDX-FileCopyrightText: 2026 Daniel Morris <daniel@honestempire.com>
// SPDX-License-Identifier: MIT

export {}

declare module 'prettier' {
  interface Options {
    yamlAlignValuesProperties?: 'do_not_align' | 'on_colon' | 'on_value'
    yamlIndentSequenceValue?: boolean
    yamlSpacesWithinBraces?: boolean
    yamlSpacesWithinBrackets?: boolean
  }

  interface ParserOptions {
    yamlAlignValuesProperties?: 'do_not_align' | 'on_colon' | 'on_value'
    yamlIndentSequenceValue?: boolean
    yamlSpacesWithinBraces?: boolean
    yamlSpacesWithinBrackets?: boolean
  }
}
