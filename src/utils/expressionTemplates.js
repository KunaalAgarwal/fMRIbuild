/**
 * Pre-built CWL expression templates for common neuroimaging patterns.
 * Used by NodeComponent to offer quick expression insertion.
 * Expressions are stored as bare JS — the UI wraps them in $() automatically.
 */
export const EXPRESSION_TEMPLATES = [
    {
        label: 'Extract filename root',
        expression: 'self.nameroot',
        description: 'Get filename without extension (e.g., "sub-01_T1w")',
        applicableTypes: ['File'],
    },
    {
        label: 'Append suffix',
        expression: 'self.nameroot + "_suffix"',
        description: 'Add a custom suffix to the filename root',
        applicableTypes: ['File'],
    },
    {
        label: 'Extract BIDS subject ID',
        expression: 'self.nameroot.split("_")[0]',
        description: 'Extract sub-XX from a BIDS filename',
        applicableTypes: ['File'],
    },
    {
        label: 'Full filename',
        expression: 'self.basename',
        description: 'Get filename with extension',
        applicableTypes: ['File'],
    },
    {
        label: 'Parent directory',
        expression: 'self.dirname',
        description: 'Get the parent directory path',
        applicableTypes: ['File'],
    },
    {
        label: 'Uppercase',
        expression: 'self.toUpperCase()',
        description: 'Convert string to uppercase',
        applicableTypes: ['string'],
    },
    {
        label: 'Lowercase',
        expression: 'self.toLowerCase()',
        description: 'Convert string to lowercase',
        applicableTypes: ['string'],
    },
    {
        label: 'Split by underscore (first)',
        expression: 'self.split("_")[0]',
        description: 'Extract first segment before underscore',
        applicableTypes: ['string'],
    },
    {
        label: 'Append suffix',
        expression: 'self + "_suffix"',
        description: 'Append a custom suffix to a string value',
        applicableTypes: ['string'],
    },
];
