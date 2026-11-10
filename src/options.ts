// SPDX-FileCopyrightText: 2026 Daniel Morris <daniel@honestempire.com>
// SPDX-License-Identifier: MIT

import type { SupportOption } from 'prettier'

export interface YamlPluginOptions {
  /**
   * Align sibling block mapping properties on their colons or values.
   * @default 'do_not_align'
   */
  yamlAlignValuesProperties?: 'do_not_align' | 'on_colon' | 'on_value'
  /**
   * Put block mappings in sequence items on the line after the marker.
   * @default false
   */
  yamlBlockMappingOnNewLine?: boolean
  /**
   * Indent sequence values within block mappings.
   * @default false
   */
  yamlIndentSequenceValue?: boolean
  /**
   * Preserve source line breaks before simple scalar values.
   * @default true
   */
  yamlKeepLineBreaks?: boolean
  /**
   * Add a space after YAML line comment markers on reformat.
   * @default false
   */
  yamlLineCommentAddSpaceOnReformat?: boolean
  /**
   * Put block sequences in sequence items on the line after the marker.
   * @default false
   */
  yamlSequenceOnNewLine?: boolean
  /**
   * Put one space before YAML mapping colons.
   * @default false
   */
  yamlSpaceBeforeColon?: boolean
  /**
   * Put spaces inside YAML flow mapping braces.
   * @default true
   */
  yamlSpacesWithinBraces?: boolean
  /**
   * Put spaces inside YAML flow sequence brackets.
   * @default true
   */
  yamlSpacesWithinBrackets?: boolean
}

declare module 'prettier' {
  // Prettier derives both `Options` (all optional) and `ParserOptions` (all
  // set, defaults included) from this interface. Module augmentation requires
  // a mergeable interface declaration.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface RequiredOptions extends Required<YamlPluginOptions> {}
}

const category = 'YAML'

export const options: Record<keyof YamlPluginOptions, SupportOption> = {
  yamlAlignValuesProperties: {
    category,
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
        description: 'Align scalar values in sibling block mapping properties.',
        value: 'on_value',
      },
    ],
    default: 'do_not_align',
    description: 'Align values in YAML block mapping properties.',
    type: 'choice',
  },
  yamlBlockMappingOnNewLine: {
    category,
    default: false,
    description:
      'Put block mappings in sequence items on the line after the marker.',
    type: 'boolean',
  },
  yamlIndentSequenceValue: {
    category,
    default: false,
    description: 'Indent sequence values within block mappings.',
    type: 'boolean',
  },
  yamlKeepLineBreaks: {
    category,
    default: true,
    description: 'Preserve source line breaks before simple scalar values.',
    type: 'boolean',
  },
  yamlLineCommentAddSpaceOnReformat: {
    category,
    default: false,
    description: 'Add a space after YAML line comment markers on reformat.',
    type: 'boolean',
  },
  yamlSequenceOnNewLine: {
    category,
    default: false,
    description:
      'Put block sequences in sequence items on the line after the marker.',
    type: 'boolean',
  },
  yamlSpaceBeforeColon: {
    category,
    default: false,
    description: 'Put one space before YAML mapping colons.',
    type: 'boolean',
  },
  yamlSpacesWithinBraces: {
    category,
    default: true,
    description: 'Put spaces inside YAML flow mapping braces.',
    type: 'boolean',
  },
  yamlSpacesWithinBrackets: {
    category,
    default: true,
    description: 'Put spaces inside YAML flow sequence brackets.',
    type: 'boolean',
  },
}
