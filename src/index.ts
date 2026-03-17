// SPDX-FileCopyrightText: 2026 Daniel Morris <daniel@honestempire.com>
// SPDX-License-Identifier: MIT

import {
  doc,
  type AstPath,
  type Doc,
  type ParserOptions,
  type Plugin,
  type SupportOption,
} from 'prettier'
import * as builtinYamlPlugin from 'prettier/plugins/yaml'

type Align = doc.builders.Align
type DocObject = Exclude<Doc, string | Doc[]>
type DocRecord = DocObject &
  Partial<Record<(typeof DOC_CHILD_KEYS)[number], Doc>>
type Group = doc.builders.Group
type Line = doc.builders.Line

const { line } = doc.builders

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
  if (!isDocObject(doc)) {
    return false
  }

  return (
    doc.type === 'align' &&
    Array.isArray(doc.contents) &&
    doc.contents[0] === '' &&
    doc.contents[1] === ':'
  )
}

function isDocObject(doc: Doc): doc is DocObject {
  return Boolean(doc) && typeof doc !== 'string' && !Array.isArray(doc)
}

function isAlign(doc: Doc): doc is Align {
  return isDocObject(doc) && doc.type === 'align'
}

function isGroup(doc: Doc): doc is Group {
  return isDocObject(doc) && doc.type === 'group'
}

function isLine(doc: Doc): doc is Line {
  return isDocObject(doc) && doc.type === 'line'
}

function unwrapFirstSequenceValueIndent(doc: Doc): [Doc, boolean] {
  if (!doc || typeof doc === 'string') {
    return [doc, false]
  }

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

function addFlowCollectionSpacing(doc: Doc): [Doc, boolean] {
  if (!doc || typeof doc === 'string') {
    return [doc, false]
  }

  if (Array.isArray(doc)) {
    let changed = false
    const nextDoc: Doc[] = []
    for (const entry of doc) {
      const [nextEntry, nextChanged] = addFlowCollectionSpacing(entry)
      changed ||= nextChanged
      nextDoc.push(nextEntry)
    }

    return [changed ? nextDoc : doc, changed]
  }

  let nextDoc = doc
  let changed = false

  if (isGroup(doc) && Array.isArray(doc.contents)) {
    const [open, spacing, trailing, close] = doc.contents
    if (
      ((open === '[' && close === ']') || (open === '{' && close === '}')) &&
      isAlign(spacing) &&
      Array.isArray(spacing.contents)
    ) {
      const [leading, ...rest] = spacing.contents
      const isEmptyFlowCollection =
        Array.isArray(rest[0]) && rest[0].length === 0
      const nextLeading = isLine(leading) && leading.soft ? line : leading
      const nextTrailing =
        !isEmptyFlowCollection && isLine(trailing) && trailing.soft
          ? line
          : trailing

      if (nextLeading !== leading || nextTrailing !== trailing) {
        nextDoc = {
          ...doc,
          contents: [
            open,
            { ...spacing, contents: [nextLeading, ...rest] },
            nextTrailing,
            close,
          ],
        }
        changed = true
      }
    }
  }

  for (const key of DOC_CHILD_KEYS) {
    const docRecord = nextDoc as DocRecord
    const value = docRecord[key]
    if (value === undefined) {
      continue
    }

    const [nextValue, nextChanged] = addFlowCollectionSpacing(value)
    if (!nextChanged) {
      continue
    }

    if (!changed) {
      nextDoc = { ...nextDoc }
      changed = true
    }

    ;(nextDoc as DocRecord)[key] = nextValue
  }

  return [changed ? nextDoc : doc, changed]
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
        let doc = builtinYamlPlugin.printers.yaml.print(path, options, print)

        if (
          !options.yamlIndentSequenceValues &&
          getBlockSequenceValue(path.node as AstNode)
        ) {
          doc = unwrapFirstSequenceValueIndent(doc)[0]
        }

        if (options.yamlFlowCollectionSpacing) {
          doc = addFlowCollectionSpacing(doc)[0]
        }

        return doc
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
    yamlFlowCollectionSpacing: {
      category: 'YAML',
      default: false,
      description: 'Put spaces inside YAML flow collection delimiters.',
      type: 'boolean',
    } satisfies SupportOption,
  },
}

export default plugin
