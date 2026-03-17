// SPDX-FileCopyrightText: 2026 Daniel Morris <daniel@honestempire.com>
// SPDX-License-Identifier: MIT

export {}

declare module 'prettier' {
  interface Options {
    yamlIndentSequenceValues?: boolean
    yamlFlowCollectionSpacing?: boolean
  }

  interface ParserOptions {
    yamlIndentSequenceValues?: boolean
    yamlFlowCollectionSpacing?: boolean
  }
}
