// SPDX-FileCopyrightText: 2026 Daniel Morris <daniel@honestempire.com>
// SPDX-License-Identifier: MIT

import { doc, type Doc, type ParserOptions } from 'prettier'

import type { YamlNode } from '../ast.ts'
import { isAlign, isOptionalLine } from '../doc.ts'

const { line, softline } = doc.builders

/**
 * Sets the spacing inside `[ ]` and `{ }`.
 *
 * Prettier prints `[open, align([padding, items, …]), padding, close]`, where
 * each padding is a `line` (a space while the collection fits on one line) or
 * a `softline` (nothing).
 */
export function printFlowCollection(
  contents: Doc,
  collection: YamlNode,
  options: ParserOptions<YamlNode>,
): Doc {
  if (!Array.isArray(contents) || contents.length !== 4) {
    return contents
  }

  const body = contents[1]
  if (!isAlign(body) || !Array.isArray(body.contents)) {
    return contents
  }

  const isSpaced =
    collection.type === 'flowMapping'
      ? options.yamlSpacesWithinBraces
      : options.yamlSpacesWithinBrackets
  const [openingPadding, ...rest] = body.contents
  const padded = contents.with(1, {
    ...body,
    contents: [setPadding(openingPadding, isSpaced), ...rest],
  })
  // One space is enough inside an empty collection: `[ ]`, not `[  ]`.
  const isEmpty = collection.children?.length === 0

  return isSpaced && isEmpty
    ? padded
    : padded.with(2, setPadding(contents[2], isSpaced))
}

function setPadding(padding: Doc | undefined, isSpaced: boolean): Doc {
  if (!isOptionalLine(padding)) {
    return padding ?? ''
  }

  return isSpaced ? line : softline
}
