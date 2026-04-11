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

const { line, softline } = doc.builders

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

interface FlowCollectionSpacingOptions {
  braces: boolean
  brackets: boolean
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

function getFlowCollectionSpacing(
  open: Doc,
  close: Doc,
  options: FlowCollectionSpacingOptions,
) {
  if (open === '[' && close === ']') {
    return options.brackets
  }

  if (open === '{' && close === '}') {
    return options.braces
  }

  return null
}

function setFlatSpacing(doc: Doc, shouldSpace: boolean) {
  if (!isLine(doc)) {
    return doc
  }

  if (shouldSpace) {
    return doc.soft ? line : doc
  }

  return doc.soft ? doc : softline
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

function normalizeFlowCollectionSpacing(
  doc: Doc,
  options: FlowCollectionSpacingOptions,
): [Doc, boolean] {
  if (!doc || typeof doc === 'string') {
    return [doc, false]
  }

  if (Array.isArray(doc)) {
    let changed = false
    const nextDoc: Doc[] = []
    for (const entry of doc) {
      const [nextEntry, nextChanged] = normalizeFlowCollectionSpacing(
        entry,
        options,
      )
      changed ||= nextChanged
      nextDoc.push(nextEntry)
    }

    return [changed ? nextDoc : doc, changed]
  }

  let nextDoc = doc
  let changed = false

  if (isGroup(doc) && Array.isArray(doc.contents)) {
    const [open, spacing, trailing, close] = doc.contents
    const shouldSpace = getFlowCollectionSpacing(open, close, options)
    if (
      shouldSpace !== null &&
      isAlign(spacing) &&
      Array.isArray(spacing.contents)
    ) {
      const [leading, ...rest] = spacing.contents
      const isEmptyFlowCollection =
        Array.isArray(rest[0]) && rest[0].length === 0
      const nextLeading = setFlatSpacing(leading, shouldSpace)
      const nextTrailing =
        shouldSpace && isEmptyFlowCollection
          ? trailing
          : setFlatSpacing(trailing, shouldSpace)

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

    const [nextValue, nextChanged] = normalizeFlowCollectionSpacing(
      value,
      options,
    )
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
        const flowCollectionSpacing = {
          braces: options.yamlSpacesWithinBraces !== false,
          brackets: options.yamlSpacesWithinBrackets !== false,
        } satisfies FlowCollectionSpacingOptions

        if (
          !options.yamlIndentSequenceValue &&
          getBlockSequenceValue(path.node as AstNode)
        ) {
          doc = unwrapFirstSequenceValueIndent(doc)[0]
        }

        doc = normalizeFlowCollectionSpacing(doc, flowCollectionSpacing)[0]

        return doc
      },
    },
  },
  options: {
    yamlIndentSequenceValue: {
      category: 'YAML',
      default: false,
      description: 'Indent sequence values within block mappings.',
      type: 'boolean',
    } satisfies SupportOption,
    yamlSpacesWithinBraces: {
      category: 'YAML',
      default: true,
      description: 'Put spaces inside YAML flow mapping braces.',
      type: 'boolean',
    } satisfies SupportOption,
    yamlSpacesWithinBrackets: {
      category: 'YAML',
      default: true,
      description: 'Put spaces inside YAML flow sequence brackets.',
      type: 'boolean',
    } satisfies SupportOption,
  },
}

export default plugin
