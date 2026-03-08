import {
  AstPath,
  type Doc,
  type doc,
  type ParserOptions,
  type Plugin,
  type SupportOption,
} from 'prettier'
import * as builtinYamlPlugin from 'prettier/plugins/yaml'

type Align = doc.builders.Align

const DOC_CHILD_KEYS = [
  'contents',
  'parts',
  'breakContents',
  'flatContents',
  'expandedStates',
] as const

interface AstNode {
  type?: string
  children?: AstNode[]
  position?: { start: { line: number } }
}

function getBlockSequenceValue(mappingItem: AstNode | null | undefined) {
  const mappingValue = mappingItem?.children?.[1]
  const sequence = mappingValue?.children?.[0]

  if (
    mappingItem?.type !== 'mappingItem' ||
    mappingValue?.type !== 'mappingValue' ||
    sequence?.type !== 'sequence'
  ) {
    return null
  }

  if (
    sequence.position?.start.line === undefined ||
    mappingValue.position?.start.line === undefined ||
    sequence.position.start.line <= mappingValue.position.start.line
  ) {
    return null
  }

  return sequence
}

function isSequenceValueIndent(doc: Doc): doc is Align {
  if (typeof doc === 'string' || Array.isArray(doc)) {
    return false
  }

  return (
    doc.type === 'align' &&
    Array.isArray(doc.contents) &&
    doc.contents[0] === '' &&
    doc.contents[1] === ':'
  )
}

function unwrapFirstSequenceValueIndent(doc: Doc): [Doc, boolean] {
  if (Array.isArray(doc)) {
    let changed = false
    const nextDoc: Doc[] = []
    for (const entry of doc) {
      if (changed) {
        nextDoc.push(entry)
        continue
      }
      const [nextEntry, nextChanged] = unwrapFirstSequenceValueIndent(entry)
      changed = nextChanged
      nextDoc.push(nextEntry)
    }
    return [changed ? nextDoc : doc, changed]
  }

  if (typeof doc === 'string') {
    return [doc, false]
  }

  if (isSequenceValueIndent(doc)) {
    return [doc.contents, true]
  }

  for (const key of DOC_CHILD_KEYS) {
    if (!(key in doc)) {
      continue
    }
    const docRecord = doc as unknown as Record<string, Doc | undefined>
    const value = docRecord[key]
    if (value === undefined) {
      continue
    }
    const [nextValue, changed] = unwrapFirstSequenceValueIndent(value)
    if (changed) {
      return [{ ...docRecord, [key]: nextValue } as unknown as Doc, true]
    }
  }

  return [doc, false]
}

const astFormat = 'yaml-unindented-sequences'
const plugin: Plugin = {
  parsers: {
    yaml: {
      ...builtinYamlPlugin.parsers.yaml,
      astFormat,
    },
  },
  printers: {
    [astFormat]: {
      ...builtinYamlPlugin.printers.yaml,
      print(
        path: AstPath,
        options: ParserOptions,
        print: (path: AstPath) => Doc,
      ): Doc {
        const doc = builtinYamlPlugin.printers.yaml.print(path, options, print)

        if (options.yamlIndentSequenceValues) {
          return doc
        }

        if (!getBlockSequenceValue(path.node as AstNode)) {
          return doc
        }

        return unwrapFirstSequenceValueIndent(doc)[0]
      },
    },
  },
  options: {
    yamlIndentSequenceValues: {
      category: 'YAML',
      default: false,
      description: 'Indent sequence values within block mappings.',
      type: 'boolean',
    } satisfies SupportOption,
  },
}

export default plugin
