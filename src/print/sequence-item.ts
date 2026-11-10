// SPDX-FileCopyrightText: 2026 Daniel Morris <daniel@honestempire.com>
// SPDX-License-Identifier: MIT

import { doc, type Doc, type ParserOptions } from 'prettier'

import {
  getContent,
  hasPrefix,
  isFlowScalar,
  startsOnLaterLine,
  type YamlNode,
} from '../ast.ts'
import { isAlign } from '../doc.ts'

const { align, hardline } = doc.builders

/**
 * Moves the content of a sequence item to the line after its `-` marker.
 *
 * Prettier prints `['- ', align(2, content)]`.
 */
export function printSequenceItem(
  contents: Doc,
  item: YamlNode,
  options: ParserOptions<YamlNode>,
): Doc {
  if (!Array.isArray(contents) || !startsOnNewLine(item, options)) {
    return contents
  }

  const [marker, content] = contents
  if (contents.length !== 2 || marker !== '- ' || !isAlign(content)) {
    return contents
  }

  return [
    '-',
    align(' '.repeat(options.tabWidth), [hardline, content.contents]),
  ]
}

function startsOnNewLine(item: YamlNode, options: ParserOptions<YamlNode>) {
  const content = getContent(item)
  // An anchor, a tag or a comment keeps the marker's line for itself.
  if (!content || hasPrefix(content)) {
    return false
  }

  switch (content.type) {
    case 'mapping':
      return options.yamlBlockMappingOnNewLine
    case 'sequence':
      return options.yamlSequenceOnNewLine
    default:
      return (
        options.yamlKeepLineBreaks &&
        isFlowScalar(content) &&
        startsOnLaterLine(content, item)
      )
  }
}
