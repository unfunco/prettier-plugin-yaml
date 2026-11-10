// SPDX-FileCopyrightText: 2026 Daniel Morris <daniel@honestempire.com>
// SPDX-License-Identifier: MIT

interface YamlPoint {
  line: number
  offset: number
}

/** The parts of Prettier's (unexported) YAML AST that this plugin reads. */
export interface YamlNode {
  type: string
  position: { start: YamlPoint; end: YamlPoint }
  anchor?: YamlNode | null
  children?: YamlNode[]
  leadingComments?: YamlNode[]
  tag?: YamlNode | null
  value?: string
}

const FLOW_SCALAR_TYPES = new Set(['plain', 'quoteDouble', 'quoteSingle'])
const BLOCK_SCALAR_TYPES = new Set(['blockFolded', 'blockLiteral'])

/** The node held by a mapping key, a mapping value or a sequence item. */
export function getContent(node: YamlNode | undefined): YamlNode | undefined {
  return node?.children?.length === 1 ? node.children[0] : undefined
}

/** Whether the node is a plain or quoted scalar. */
export function isFlowScalar(node: YamlNode | undefined): node is YamlNode {
  return node !== undefined && FLOW_SCALAR_TYPES.has(node.type)
}

/** Whether the node is a plain, quoted, literal or folded scalar. */
export function isScalar(node: YamlNode | undefined): node is YamlNode {
  return (
    node !== undefined &&
    (FLOW_SCALAR_TYPES.has(node.type) || BLOCK_SCALAR_TYPES.has(node.type))
  )
}

/** Whether an anchor, a tag or a comment is printed ahead of the node. */
export function hasPrefix(node: YamlNode): boolean {
  return Boolean(node.anchor ?? node.tag ?? node.leadingComments?.length)
}

/** Whether the source puts the node on a later line than its container. */
export function startsOnLaterLine(node: YamlNode, container: YamlNode) {
  return node.position.start.line > container.position.start.line
}
