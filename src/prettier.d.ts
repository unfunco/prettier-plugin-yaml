export {}

declare module 'prettier' {
  interface Options {
    yamlIndentSequenceValues?: boolean
  }

  interface ParserOptions {
    yamlIndentSequenceValues?: boolean
  }
}
