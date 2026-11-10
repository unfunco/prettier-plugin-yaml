// SPDX-FileCopyrightText: 2026 Daniel Morris <daniel@honestempire.com>
// SPDX-License-Identifier: MIT

import type { Printer } from 'prettier'
import { printers } from 'prettier/plugins/yaml'

import type { YamlNode } from './ast.ts'
import { mapNodeContents } from './doc.ts'
import { printComment } from './print/comment.ts'
import { printFlowCollection } from './print/flow-collection.ts'
import { alignMappingItems, printMappingItem } from './print/mapping-item.ts'
import { printSequenceItem } from './print/sequence-item.ts'

// Prettier does not export the node type of its YAML printer.
const yamlPrinter = printers.yaml as Printer<YamlNode>

/**
 * Prettier's YAML printer, with the Docs of a few node types adjusted after
 * the fact.
 *
 * Children are printed through this printer before their parents, so each
 * adjustment only has to look at the node's own Doc, never at its
 * descendants: the work stays linear in the size of the document.
 */
export const printer: Printer<YamlNode> = {
  ...yamlPrinter,
  print(path, options, print, args) {
    const doc = yamlPrinter.print(path, options, print, args)
    const { node } = path

    switch (node.type) {
      case 'comment':
        return mapNodeContents(doc, (contents) =>
          printComment(contents, node, options),
        )
      case 'flowMapping':
      case 'flowSequence':
        return mapNodeContents(doc, (contents) =>
          printFlowCollection(contents, node, options),
        )
      case 'flowMappingItem':
      case 'mappingItem':
        return mapNodeContents(doc, (contents) =>
          printMappingItem(contents, node, options),
        )
      case 'mapping':
        alignMappingItems(node)
        return doc
      case 'sequenceItem':
        return mapNodeContents(doc, (contents) =>
          printSequenceItem(contents, node, options),
        )
      default:
        return doc
    }
  },
}
