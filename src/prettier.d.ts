// SPDX-FileCopyrightText: 2026 Daniel Morris <daniel@honestempire.com>
// SPDX-License-Identifier: MIT

export {}

declare module 'prettier' {
  interface Options {
    yamlIndentSequenceValue?: boolean
    yamlSpacesWithinBraces?: boolean
    yamlSpacesWithinBrackets?: boolean
  }

  interface ParserOptions {
    yamlIndentSequenceValue?: boolean
    yamlSpacesWithinBraces?: boolean
    yamlSpacesWithinBrackets?: boolean
  }
}
