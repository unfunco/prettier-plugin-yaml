// SPDX-FileCopyrightText: 2026 Daniel Morris <daniel@honestempire.com>
// SPDX-License-Identifier: MIT

import { util, type Doc, type doc } from 'prettier'

type DocCommand = Exclude<Doc, string | Doc[]>
type DocCommandOfType<T extends DocCommand['type']> = Extract<
  DocCommand,
  { type: T }
>

export type Align = doc.builders.Align
export type Group = doc.builders.Group

// Prettier's YAML printer bundles its own copy of the Doc builders, so its
// Docs have to be recognized by shape rather than by identity.
function isCommand<T extends DocCommand['type']>(
  value: Doc | undefined,
  type: T,
): value is DocCommandOfType<T> {
  return (
    typeof value === 'object' && !Array.isArray(value) && value.type === type
  )
}

export function isAlign(value: Doc | undefined): value is Align {
  return isCommand(value, 'align')
}

export function isGroup(value: Doc | undefined): value is Group {
  return isCommand(value, 'group')
}

export function isIfBreak(value: Doc | undefined) {
  return isCommand(value, 'if-break')
}

/** Whether the Doc is a `line` or a `softline`: a break that may stay flat. */
export function isOptionalLine(value: Doc | undefined) {
  return isCommand(value, 'line') && !value.hard
}

/**
 * Applies `transform` to what Prettier's YAML printer printed for the node
 * itself.
 *
 * The printer returns every node as a list of parts: its comments, tag and
 * anchor around a single group that holds the node's own content. A node
 * under `# prettier-ignore` has no such group and is left untouched.
 */
export function mapNodeContents(
  parts: Doc,
  transform: (contents: Doc) => Doc,
): Doc {
  if (!Array.isArray(parts)) {
    return parts
  }

  const index = parts.findIndex((part) => isGroup(part))
  const group = parts[index]
  if (!isGroup(group)) {
    return parts
  }

  const contents = transform(group.contents)

  return contents === group.contents
    ? parts
    : parts.with(index, { ...group, contents })
}

/**
 * The width of a Doc printed on one line, or `undefined` when it cannot be:
 * it contains a forced line break.
 */
export function getFlatWidth(value: Doc | undefined): number | undefined {
  if (value === undefined) {
    return 0
  }

  if (typeof value === 'string') {
    return util.getStringWidth(value)
  }

  if (Array.isArray(value)) {
    return sumFlatWidths(value)
  }

  switch (value.type) {
    case 'align':
    case 'group':
    case 'indent':
    case 'label':
      return getFlatWidth(value.contents)
    case 'fill':
      return sumFlatWidths(value.parts)
    case 'if-break':
      return getFlatWidth(value.flatContents)
    case 'line':
      if (value.hard) {
        return undefined
      }
      return value.soft ? 0 : 1
    case 'break-parent':
    case 'cursor':
    case 'line-suffix':
    case 'line-suffix-boundary':
      // Nothing is printed in place: line suffixes wait for the line's end.
      return 0
    default:
      return undefined
  }
}

function sumFlatWidths(parts: Doc[]): number | undefined {
  let total = 0
  for (const part of parts) {
    const width = getFlatWidth(part)
    if (width === undefined) {
      return undefined
    }
    total += width
  }

  return total
}
