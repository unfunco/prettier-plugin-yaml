// SPDX-FileCopyrightText: 2026 Daniel Morris <daniel@honestempire.com>
// SPDX-License-Identifier: MIT

import { doc, type Doc, type ParserOptions } from 'prettier'

import {
  getContent,
  hasPrefix,
  isFlowScalar,
  isScalar,
  startsOnLaterLine,
  type YamlNode,
} from '../ast.ts'
import {
  getFlatWidth,
  isAlign,
  isGroup,
  isIfBreak,
  isOptionalLine,
  type Align,
} from '../doc.ts'

const { align, hardline } = doc.builders

type Alignment = ParserOptions['yamlAlignValuesProperties']

interface Layout {
  item: YamlNode
  alignment: Alignment
  /** Filled in by `alignMappingItems` once every sibling key is measured. */
  alignmentPadding: Doc[]
  indentation: string
  /** Print the value on the line after the key, as the source does. */
  keepsLineBreak: boolean
  spaceBeforeColon: boolean
  /** Print the value in the key's column rather than indented under it. */
  unindentsValue: boolean
}

interface KeyAlignment {
  keyWidth: number
  padding: Doc[]
}

/** The mapping items waiting for `alignMappingItems` to pad them. */
const keyAlignments = new WeakMap<YamlNode, KeyAlignment>()

/**
 * Formats the `:` between a mapping key and its value, and places the value.
 *
 * Only keys printed in line with their colon (`key: value`) are formatted.
 * Prettier prints those as one of:
 *
 * - `[key, space, ':']` and `[key, space, ': ', value]`, when the item is
 *   certain to fit on one line;
 * - a conditional group of `[key, align([space, ':', gap, value])]`, where
 *   `gap` is the break between the colon and the value;
 * - a conditional group of `[key, ifBreak(explicit, align([…]))]`, when the
 *   key might wrap and need the explicit `? key` form instead.
 *
 * `space` is `' '` after an alias key (`*a : b`) and `''` otherwise.
 */
export function printMappingItem(
  contents: Doc,
  item: YamlNode,
  options: ParserOptions<YamlNode>,
): Doc {
  const layout = getLayout(item, options)
  if (!layout) {
    return contents
  }

  if (Array.isArray(contents)) {
    return printFlatItem(contents, layout)
  }

  if (isGroup(contents) && Array.isArray(contents.expandedStates)) {
    const expandedStates = contents.expandedStates.map((state) =>
      printBreakableItem(state, layout),
    )

    return {
      ...contents,
      contents: expandedStates[0] ?? contents.contents,
      expandedStates,
    }
  }

  return contents
}

/**
 * Pads the mapping's items so that their colons or values line up.
 *
 * Runs once Prettier has printed every item, because only then is the widest
 * key known.
 */
export function alignMappingItems(mapping: YamlNode): void {
  const alignments: KeyAlignment[] = []
  let widestKey = 0
  for (const item of mapping.children ?? []) {
    const alignment = keyAlignments.get(item)
    if (alignment) {
      alignments.push(alignment)
      widestKey = Math.max(widestKey, alignment.keyWidth)
    }
  }

  for (const { keyWidth, padding } of alignments) {
    padding[0] = ' '.repeat(widestKey - keyWidth)
  }
}

function getLayout(
  item: YamlNode,
  options: ParserOptions<YamlNode>,
): Layout | undefined {
  const [key, value] = item.children ?? []
  const valueContent = getContent(value)
  const isBlockItem = item.type === 'mappingItem'

  const keepsLineBreak =
    isBlockItem &&
    options.yamlKeepLineBreaks &&
    value !== undefined &&
    isFlowScalar(valueContent) &&
    !hasPrefix(valueContent) &&
    startsOnLaterLine(valueContent, value)
  const unindentsValue =
    isBlockItem &&
    !options.yamlIndentSequenceValue &&
    valueContent?.type === 'sequence'
  const alignment =
    isBlockItem && isFlowScalar(getContent(key))
      ? getAlignment(options.yamlAlignValuesProperties, valueContent)
      : 'do_not_align'

  if (
    !keepsLineBreak &&
    !unindentsValue &&
    !options.yamlSpaceBeforeColon &&
    alignment === 'do_not_align'
  ) {
    return undefined
  }

  return {
    item,
    alignment,
    alignmentPadding: [],
    indentation: ' '.repeat(options.tabWidth),
    keepsLineBreak,
    spaceBeforeColon: options.yamlSpaceBeforeColon,
    unindentsValue,
  }
}

function getAlignment(
  alignment: Alignment,
  valueContent: YamlNode | undefined,
): Alignment {
  // Only scalars are aligned as values: collections start on their own line.
  return alignment === 'on_value' && !isScalar(valueContent)
    ? 'do_not_align'
    : alignment
}

function printFlatItem(parts: Doc[], layout: Layout): Doc {
  const [key, space, separator, ...value] = parts
  if (
    key !== undefined &&
    typeof key !== 'string' &&
    typeof space === 'string' &&
    (separator === ':' || separator === ': ')
  ) {
    const gap = separator === ': ' ? [' '] : []
    const printed = printSeparator(key, space, [...gap, ...value], layout)

    return [
      key,
      printed.breaksLine
        ? align(layout.indentation, printed.parts)
        : printed.parts,
    ]
  }

  // An explicit `? key` or a missing key leaves `: value` on its own line.
  const index = layout.keepsLineBreak ? parts.indexOf(': ') : -1
  if (index < 0 || index === parts.length - 1) {
    return parts
  }

  return [
    ...parts.slice(0, index),
    align(layout.indentation, [':', hardline, ...parts.slice(index + 1)]),
  ]
}

function printBreakableItem(state: Doc, layout: Layout): Doc {
  if (!Array.isArray(state) || state.length !== 2) {
    return state
  }

  const [key, value] = state
  if (isAlign(value)) {
    return state.with(1, printIndentedValue(key, value, layout))
  }

  if (isIfBreak(value) && isAlign(value.flatContents)) {
    return state.with(1, {
      ...value,
      flatContents: printIndentedValue(key, value.flatContents, layout),
    })
  }

  return state
}

function printIndentedValue(
  key: Doc | undefined,
  value: Align,
  layout: Layout,
): Doc {
  if (!Array.isArray(value.contents)) {
    return value
  }

  const [space, separator, ...rest] = value.contents
  if (space === undefined || separator !== ':') {
    return value
  }

  const { parts } = printSeparator(key, space, rest, layout)

  return layout.unindentsValue ? parts : { ...value, contents: parts }
}

/**
 * Prints all that follows a key on its line: `space`, the colon, and `rest`,
 * which is the value and the gap that separates it from the colon.
 */
function printSeparator(
  key: Doc | undefined,
  space: Doc,
  rest: Doc[],
  layout: Layout,
): { breaksLine: boolean; parts: Doc[] } {
  const [gap, ...value] = rest
  const followsColon = gap === ' ' || isOptionalLine(gap)
  const breaksLine = layout.keepsLineBreak && followsColon
  const beforeColon: Doc[] = [layout.spaceBeforeColon ? ' ' : space]
  const afterColon: Doc[] = []

  // A value that cannot follow its colon has nothing to align.
  const isAligned =
    layout.alignment === 'on_colon' ||
    (layout.alignment === 'on_value' && followsColon && !breaksLine)
  const keyWidth = isAligned ? getFlatWidth(key) : undefined
  if (keyWidth !== undefined) {
    // The padding is empty until every sibling of the item has been printed.
    const padding = layout.alignmentPadding
    keyAlignments.set(layout.item, { keyWidth, padding })
    ;(layout.alignment === 'on_colon' ? beforeColon : afterColon).push(padding)
  }

  return {
    breaksLine,
    parts: [
      ...beforeColon,
      ':',
      ...afterColon,
      ...(breaksLine ? [hardline, ...value] : rest),
    ],
  }
}
