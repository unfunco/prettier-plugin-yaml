// SPDX-FileCopyrightText: 2026 Daniel Morris <daniel@honestempire.com>
// SPDX-License-Identifier: MIT

import type { Doc, ParserOptions } from 'prettier'

import type { YamlNode } from '../ast.ts'

/** Prints `#comment` as `# comment`. Prettier prints `['#', text]`. */
export function printComment(
  contents: Doc,
  comment: YamlNode,
  options: ParserOptions<YamlNode>,
): Doc {
  if (
    !options.yamlLineCommentAddSpaceOnReformat ||
    !Array.isArray(contents) ||
    contents[0] !== '#' ||
    !/^\S/u.test(comment.value ?? '')
  ) {
    return contents
  }

  return ['# ', ...contents.slice(1)]
}
