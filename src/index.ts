// SPDX-FileCopyrightText: 2026 Daniel Morris <daniel@honestempire.com>
// SPDX-License-Identifier: MIT

import {
  doc,
  util,
  type AstPath,
  type Doc,
  type ParserOptions,
  type Plugin,
  type SupportOption,
} from 'prettier'
import * as builtinYamlPlugin from 'prettier/plugins/yaml'

export type { YamlPluginOptions } from './prettier.js'

type Align = doc.builders.Align
type BlockSequenceCollectionType = 'mapping' | 'sequence'
type DocObject = Exclude<Doc, string | Doc[]>
type DocRecord = DocObject &
  Partial<Record<(typeof DOC_CHILD_KEYS)[number], Doc>>
type Group = doc.builders.Group
type Line = doc.builders.Line
type YamlAlignValuesProperties = 'do_not_align' | 'on_colon' | 'on_value'
type YamlMappingSeparator = ':' | ': '

const { align, hardline, line, softline } = doc.builders

const DOC_CHILD_KEYS = [
  'contents',
  'parts',
  'breakContents',
  'flatContents',
  'expandedStates',
] as const

interface AstNode {
  type?: string
  anchor?: AstNode | null
  children?: AstNode[]
  leadingComments?: AstNode[]
  position?: {
    start: { line: number; offset: number }
    end: { line: number; offset: number }
  }
  tag?: AstNode | null
  value?: string
}

interface FlowCollectionSpacingOptions {
  braces: boolean
  brackets: boolean
}

const SCALAR_KEY_TYPES = new Set(['plain', 'quoteDouble', 'quoteSingle'])
const SCALAR_VALUE_TYPES = new Set([
  ...SCALAR_KEY_TYPES,
  'blockFolded',
  'blockLiteral',
])

function getAlignment(options: ParserOptions): YamlAlignValuesProperties {
  const alignment: unknown = options.yamlAlignValuesProperties

  if (alignment === undefined || alignment === 'do_not_align') {
    return 'do_not_align'
  }

  if (alignment === 'on_colon' || alignment === 'on_value') {
    return alignment
  }

  throw new TypeError('Invalid yamlAlignValuesProperties value.')
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

function getBlockSequenceCollection(
  sequenceItem: AstNode | null | undefined,
  collectionType: BlockSequenceCollectionType,
) {
  const collection = sequenceItem?.children?.[0]

  return sequenceItem?.type === 'sequenceItem' &&
    collection?.type === collectionType
    ? collection
    : null
}

function getSimpleScalar(node: AstNode | null | undefined) {
  if (
    !node?.type ||
    !SCALAR_KEY_TYPES.has(node.type) ||
    node.anchor ||
    node.tag ||
    node.leadingComments?.length
  ) {
    return null
  }

  return node
}

function startsOnLaterLine(
  container: AstNode | null | undefined,
  value: AstNode | null | undefined,
) {
  return Boolean(
    container?.position &&
    value?.position &&
    value.position.start.line > container.position.start.line,
  )
}

function getMultilineMappingScalar(mappingItem: AstNode) {
  const mappingValue = mappingItem.children?.[1]
  const scalar =
    mappingValue?.children?.length === 1
      ? getSimpleScalar(mappingValue.children[0])
      : null

  return mappingItem.type === 'mappingItem' &&
    mappingValue?.type === 'mappingValue' &&
    startsOnLaterLine(mappingValue, scalar)
    ? scalar
    : null
}

function getMultilineSequenceScalar(sequenceItem: AstNode) {
  const scalar =
    sequenceItem.children?.length === 1
      ? getSimpleScalar(sequenceItem.children[0])
      : null

  return sequenceItem.type === 'sequenceItem' &&
    startsOnLaterLine(sequenceItem, scalar)
    ? scalar
    : null
}

function hasBlockCollectionPrefix(collection: AstNode) {
  return Boolean(
    collection.anchor ?? collection.tag ?? collection.leadingComments?.length,
  )
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

function replaceFirstDoc(
  doc: Doc,
  replace: (doc: Doc) => Doc | null,
): [Doc, boolean] {
  const replacement = replace(doc)
  if (replacement !== null) {
    return [replacement, true]
  }

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

      const [nextEntry, nextChanged] = replaceFirstDoc(entry, replace)
      changed = nextChanged
      nextDoc.push(nextEntry)
    }

    return [changed ? nextDoc : doc, changed]
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

    const [nextValue, changed] = replaceFirstDoc(value, replace)
    if (changed) {
      return [{ ...docRecord, [key]: nextValue } as unknown as Doc, true]
    }
  }

  return [doc, false]
}

function isMappingSeparator(doc: Doc): doc is YamlMappingSeparator {
  return doc === ':' || doc === ': '
}

function containsHardline(doc: Doc): boolean {
  return isLine(doc)
    ? Boolean(doc.hard)
    : Array.isArray(doc) && doc.some(containsHardline)
}

function formatMappingSeparator(
  separator: YamlMappingSeparator,
  spaceBeforeColon: boolean,
  alignment: YamlAlignValuesProperties,
  padding: number,
) {
  const beforeColon =
    (spaceBeforeColon ? 1 : 0) + (alignment === 'on_colon' ? padding : 0)
  const afterColon =
    (separator === ': ' ? 1 : 0) + (alignment === 'on_value' ? padding : 0)

  return `${' '.repeat(beforeColon)}:${' '.repeat(afterColon)}`
}

function mapMappingSeparatorContainer(
  doc: Doc,
  format: (separator: YamlMappingSeparator) => Doc,
): [Doc, boolean] {
  if (!isDocObject(doc)) {
    return [doc, false]
  }

  const docRecord = doc as unknown as Record<string, Doc | undefined>
  let nextDoc = doc
  let changed = false

  for (const key of ['contents', 'breakContents', 'flatContents'] as const) {
    const value = docRecord[key]
    if (value === undefined) {
      continue
    }

    const [nextValue, nextChanged] = mapMappingSeparatorLayout(value, format)
    if (!nextChanged) {
      continue
    }

    if (!changed) {
      nextDoc = { ...doc }
      changed = true
    }

    ;(nextDoc as unknown as Record<string, Doc>)[key] = nextValue
  }

  if (Array.isArray(docRecord.expandedStates)) {
    let expandedStatesChanged = false
    const nextExpandedStates: Doc[] = []
    for (const state of docRecord.expandedStates) {
      const [nextState, nextChanged] = mapMappingSeparatorLayout(state, format)
      expandedStatesChanged ||= nextChanged
      nextExpandedStates.push(nextState)
    }

    if (expandedStatesChanged) {
      if (!changed) {
        nextDoc = { ...doc }
        changed = true
      }

      ;(nextDoc as unknown as Record<string, Doc>).expandedStates =
        nextExpandedStates
    }
  }

  return [changed ? nextDoc : doc, changed]
}

function mapMappingSeparatorLayout(
  doc: Doc,
  format: (separator: YamlMappingSeparator) => Doc,
): [Doc, boolean] {
  if (isMappingSeparator(doc)) {
    return [format(doc), true]
  }

  if (Array.isArray(doc)) {
    const separatorIndex = doc.findIndex(isMappingSeparator)
    if (separatorIndex >= 0) {
      const separator = doc[separatorIndex]
      const startsOnNewLine = doc
        .slice(0, separatorIndex)
        .some(containsHardline)
      // A wrapped explicit key uses `: value` on its own line.
      if (startsOnNewLine) {
        return [doc, false]
      }

      if (isMappingSeparator(separator)) {
        const nextDoc = [...doc]
        nextDoc[separatorIndex] = format(separator)
        return [nextDoc, true]
      }
    }

    let changed = false
    const nextDoc: Doc[] = []
    for (const [index, entry] of doc.entries()) {
      // The key Doc is first; never search its scalar content for separators.
      if (index === 0) {
        nextDoc.push(entry)
        continue
      }

      const [nextEntry, nextChanged] = mapMappingSeparatorContainer(
        entry,
        format,
      )
      changed ||= nextChanged
      nextDoc.push(nextEntry)
    }

    return [changed ? nextDoc : doc, changed]
  }

  return mapMappingSeparatorContainer(doc, format)
}

function mapMappingItemSeparator(
  doc: Doc,
  format: (separator: YamlMappingSeparator) => Doc,
) {
  if (Array.isArray(doc)) {
    let changed = false
    const nextDoc: Doc[] = []
    for (const entry of doc) {
      const [nextEntry, nextChanged] = mapMappingSeparatorContainer(
        entry,
        format,
      )
      changed ||= nextChanged
      nextDoc.push(nextEntry)
    }

    return changed ? nextDoc : doc
  }

  return mapMappingSeparatorContainer(doc, format)[0]
}

function unwrapFirstSequenceValueIndent(doc: Doc) {
  return replaceFirstDoc(doc, (candidate) =>
    isSequenceValueIndent(candidate) ? candidate.contents : null,
  )
}

function addSpaceAfterLineCommentMarker(doc: Doc, node: AstNode) {
  if (
    node.type !== 'comment' ||
    typeof node.value !== 'string' ||
    !/^\S/u.test(node.value)
  ) {
    return doc
  }

  return replaceFirstDoc(doc, (candidate) =>
    candidate === '#' ? '# ' : null,
  )[0]
}

function preserveMappingScalarLineBreak(
  doc: Doc,
  mappingItem: AstNode,
  options: ParserOptions,
) {
  if (!getMultilineMappingScalar(mappingItem)) {
    return doc
  }

  return replaceFirstDoc(doc, (candidate) => {
    if (
      isAlign(candidate) &&
      Array.isArray(candidate.contents) &&
      candidate.contents[1] === ':' &&
      isLine(candidate.contents[2]) &&
      !candidate.contents[2].hard
    ) {
      return {
        ...candidate,
        contents: [
          ...candidate.contents.slice(0, 2),
          hardline,
          ...candidate.contents.slice(3),
        ],
      }
    }

    if (!isGroup(candidate) || !Array.isArray(candidate.contents)) {
      return null
    }

    const separatorIndex = candidate.contents.indexOf(': ')
    if (
      separatorIndex < 0 ||
      separatorIndex === candidate.contents.length - 1
    ) {
      return null
    }

    return {
      ...candidate,
      contents: [
        ...candidate.contents.slice(0, separatorIndex),
        align(' '.repeat(options.tabWidth), [
          ':',
          hardline,
          ...candidate.contents.slice(separatorIndex + 1),
        ]),
      ],
    }
  })[0]
}

function preserveSequenceScalarLineBreak(
  doc: Doc,
  sequenceItem: AstNode,
  options: ParserOptions,
) {
  if (!getMultilineSequenceScalar(sequenceItem)) {
    return doc
  }

  return putBlockSequenceValueOnNewLine(doc, options)
}

function putBlockSequenceValueOnNewLine(doc: Doc, options: ParserOptions): Doc {
  if (!Array.isArray(doc)) {
    return doc
  }

  const [item, ...suffix] = doc
  if (!isGroup(item) || !Array.isArray(item.contents)) {
    return doc
  }

  const [marker, value, ...rest] = item.contents
  if (marker !== '- ' || !isAlign(value)) {
    return doc
  }

  return [
    {
      ...item,
      contents: [
        '-',
        align(' '.repeat(options.tabWidth), [hardline, value.contents]),
        ...rest,
      ],
    },
    ...suffix,
  ]
}

function putBlockSequenceCollectionOnNewLine(
  doc: Doc,
  sequenceItem: AstNode,
  options: ParserOptions,
  collectionType: BlockSequenceCollectionType,
): Doc {
  const collection = getBlockSequenceCollection(sequenceItem, collectionType)
  if (!collection || hasBlockCollectionPrefix(collection)) {
    return doc
  }

  return putBlockSequenceValueOnNewLine(doc, options)
}

function getComparableScalar(
  mappingItem: AstNode,
  childIndex: 0 | 1,
): AstNode | null {
  const child = mappingItem.children?.[childIndex]
  const scalar = child?.children?.[0]
  const scalarTypes = childIndex === 0 ? SCALAR_KEY_TYPES : SCALAR_VALUE_TYPES

  if (
    mappingItem.type !== 'mappingItem' ||
    child?.children?.length !== 1 ||
    !scalar?.type ||
    !scalarTypes.has(scalar.type)
  ) {
    return null
  }

  return scalar
}

function isComparableMappingItem(
  mappingItem: AstNode,
  alignment: Exclude<YamlAlignValuesProperties, 'do_not_align'>,
  keepLineBreaks: boolean,
) {
  return Boolean(
    getComparableScalar(mappingItem, 0) &&
    (alignment === 'on_colon' ||
      (getComparableScalar(mappingItem, 1) &&
        !(keepLineBreaks && getMultilineMappingScalar(mappingItem)))),
  )
}

function getMappingKeyWidth(mappingItem: AstNode, options: ParserOptions) {
  const key = getComparableScalar(mappingItem, 0)
  if (!key?.position) {
    return null
  }

  return util.getStringWidth(
    options.originalText.slice(
      key.position.start.offset,
      key.position.end.offset,
    ),
  )
}

function getMappingAlignmentPadding(
  mappingItem: AstNode,
  mapping: AstNode | null,
  options: ParserOptions,
  alignment: Exclude<YamlAlignValuesProperties, 'do_not_align'>,
) {
  const keepLineBreaks = options.yamlKeepLineBreaks !== false
  if (
    mappingItem.type !== 'mappingItem' ||
    mapping?.type !== 'mapping' ||
    !isComparableMappingItem(mappingItem, alignment, keepLineBreaks)
  ) {
    return null
  }

  const currentWidth = getMappingKeyWidth(mappingItem, options)
  const siblingWidths = mapping.children
    ?.filter((sibling) =>
      isComparableMappingItem(sibling, alignment, keepLineBreaks),
    )
    .map((sibling) => getMappingKeyWidth(sibling, options))
    .filter((width): width is number => width !== null)

  return currentWidth === null || !siblingWidths?.length
    ? null
    : Math.max(...siblingWidths) - currentWidth
}

function formatMappingItemSeparator(
  doc: Doc,
  mappingItem: AstNode,
  mapping: AstNode | null,
  options: ParserOptions,
  alignment: YamlAlignValuesProperties,
) {
  if (
    mappingItem.type !== 'mappingItem' &&
    mappingItem.type !== 'flowMappingItem'
  ) {
    return doc
  }

  const spaceBeforeColon = options.yamlSpaceBeforeColon === true
  const padding =
    alignment === 'do_not_align'
      ? null
      : getMappingAlignmentPadding(mappingItem, mapping, options, alignment)
  const appliedAlignment = padding === null ? 'do_not_align' : alignment
  if (!spaceBeforeColon && appliedAlignment === 'do_not_align') {
    return doc
  }

  return mapMappingItemSeparator(doc, (separator) =>
    formatMappingSeparator(
      separator,
      spaceBeforeColon,
      appliedAlignment,
      padding ?? 0,
    ),
  )
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
        const alignment = getAlignment(options)
        const flowCollectionSpacing = {
          braces: options.yamlSpacesWithinBraces !== false,
          brackets: options.yamlSpacesWithinBrackets !== false,
        } satisfies FlowCollectionSpacingOptions

        if (options.yamlLineCommentAddSpaceOnReformat) {
          doc = addSpaceAfterLineCommentMarker(doc, path.node as AstNode)
        }

        if (options.yamlKeepLineBreaks !== false) {
          doc = preserveMappingScalarLineBreak(
            doc,
            path.node as AstNode,
            options,
          )
          doc = preserveSequenceScalarLineBreak(
            doc,
            path.node as AstNode,
            options,
          )
        }

        doc = formatMappingItemSeparator(
          doc,
          path.node as AstNode,
          path.parent as AstNode | null,
          options,
          alignment,
        )

        if (
          !options.yamlIndentSequenceValue &&
          getBlockSequenceValue(path.node as AstNode)
        ) {
          doc = unwrapFirstSequenceValueIndent(doc)[0]
        }

        if (options.yamlBlockMappingOnNewLine) {
          doc = putBlockSequenceCollectionOnNewLine(
            doc,
            path.node as AstNode,
            options,
            'mapping',
          )
        }

        if (options.yamlSequenceOnNewLine) {
          doc = putBlockSequenceCollectionOnNewLine(
            doc,
            path.node as AstNode,
            options,
            'sequence',
          )
        }

        doc = normalizeFlowCollectionSpacing(doc, flowCollectionSpacing)[0]

        return doc
      },
    },
  },
  options: {
    yamlAlignValuesProperties: {
      category: 'YAML',
      choices: [
        {
          description: 'Do not align mapping properties.',
          value: 'do_not_align',
        },
        {
          description: 'Align colons in sibling block mapping properties.',
          value: 'on_colon',
        },
        {
          description:
            'Align scalar values in sibling block mapping properties.',
          value: 'on_value',
        },
      ],
      default: 'do_not_align',
      description: 'Align values in YAML block mapping properties.',
      type: 'choice',
    } satisfies SupportOption,
    yamlBlockMappingOnNewLine: {
      category: 'YAML',
      default: false,
      description:
        'Put block mappings in sequence items on the line after the marker.',
      type: 'boolean',
    } satisfies SupportOption,
    yamlIndentSequenceValue: {
      category: 'YAML',
      default: false,
      description: 'Indent sequence values within block mappings.',
      type: 'boolean',
    } satisfies SupportOption,
    yamlKeepLineBreaks: {
      category: 'YAML',
      default: true,
      description: 'Preserve source line breaks before simple scalar values.',
      type: 'boolean',
    } satisfies SupportOption,
    yamlLineCommentAddSpaceOnReformat: {
      category: 'YAML',
      default: false,
      description: 'Add a space after YAML line comment markers on reformat.',
      type: 'boolean',
    } satisfies SupportOption,
    yamlSequenceOnNewLine: {
      category: 'YAML',
      default: false,
      description:
        'Put block sequences in sequence items on the line after the marker.',
      type: 'boolean',
    } satisfies SupportOption,
    yamlSpaceBeforeColon: {
      category: 'YAML',
      default: false,
      description: 'Put one space before YAML mapping colons.',
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
