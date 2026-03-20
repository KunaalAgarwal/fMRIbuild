/**
 * Extension validation utilities for neuroimaging file compatibility.
 * Used to validate that output file extensions are compatible with input requirements.
 */

// Extension categories for neuroimaging file types
export const EXTENSION_CATEGORIES = {
    nifti: ['.nii', '.nii.gz'],
    afni: ['+orig.HEAD', '+orig.BRIK', '+tlrc.HEAD', '+tlrc.BRIK', '+orig.BRIK.gz', '+tlrc.BRIK.gz'],
    freesurfer: ['.mgz', '.mgh'],
    surface: ['.vtk', '.stl', '.gii', '.pial', '.white', '.inflated', '.sphere', '.sulc'],
    transform_fsl: ['.mat'],
    transform_ants: ['.mat', 'Warp.nii.gz', 'InverseWarp.nii.gz', 'GenericAffine.mat'],
    transform_fs: ['.lta', '.xfm', '.dat'],
    text: ['.txt', '.csv', '.1D', '.par', '.tsv'],
    log: ['.log'],
};

// Compatibility matrix: which categories can connect to each other
// Categories in the array are compatible with the key category
const COMPATIBLE_CATEGORIES = {
    nifti: ['nifti', 'afni', 'freesurfer'],
    afni: ['nifti', 'afni'],
    freesurfer: ['nifti', 'freesurfer'],
    surface: ['surface'],
    transform_fsl: ['transform_fsl', 'transform_ants'],
    transform_ants: ['transform_fsl', 'transform_ants'],
    transform_fs: ['transform_fs'],
    text: ['text'],
    log: ['log'],
};

/**
 * Parse file extensions from CWL glob patterns.
 * Handles patterns like:
 *   - '$(inputs.output).nii.gz' -> ['.nii.gz']
 *   - '$(inputs.prefix)+orig.HEAD' -> ['+orig.HEAD']
 *   - '*.nii*' -> ['.nii', '.nii.gz']
 *
 * @param {string[]} globPatterns - Array of glob patterns from tool output definition
 * @returns {string[]} - Array of extracted file extensions
 */
export function parseExtensionsFromGlob(globPatterns) {
    if (!globPatterns || !Array.isArray(globPatterns)) return [];

    const extensions = new Set();

    for (const pattern of globPatterns) {
        // Remove CWL input references: $(inputs.xxx)
        let cleanPattern = pattern.replace(/\$\(inputs\.[^)]+\)/g, '');

        // Handle AFNI +orig and +tlrc patterns
        if (cleanPattern.includes('+orig') || cleanPattern.includes('+tlrc')) {
            // Extract the AFNI suffix pattern
            const afniMatch = cleanPattern.match(/(\+(?:orig|tlrc)\.(?:HEAD|BRIK(?:\.gz)?))/);
            if (afniMatch) {
                extensions.add(afniMatch[1]);
            } else {
                // Generic AFNI pattern
                if (cleanPattern.includes('+orig')) extensions.add('+orig.HEAD');
                if (cleanPattern.includes('+tlrc')) extensions.add('+tlrc.HEAD');
            }
            continue;
        }

        // Handle wildcards in patterns
        if (cleanPattern.includes('*')) {
            // Pattern like *.nii* means .nii and .nii.gz
            if (cleanPattern.match(/\.nii\*/) || cleanPattern.match(/\*\.nii/)) {
                extensions.add('.nii');
                extensions.add('.nii.gz');
                continue;
            }
            // Pattern like *_*.* means unknown format, skip
            if (cleanPattern.match(/\*\.\*$/)) {
                continue;
            }
            // Try to extract extension before wildcard
            const wildcardMatch = cleanPattern.match(/(\.[a-zA-Z0-9]+)\*?$/);
            if (wildcardMatch) {
                extensions.add(wildcardMatch[1]);
            }
            continue;
        }

        // Standard extension extraction - get compound extensions like .nii.gz
        // First try compound extension (.nii.gz, .tar.gz)
        const compoundMatch = cleanPattern.match(/(\.[a-zA-Z0-9]+\.[a-zA-Z0-9]+)$/);
        if (compoundMatch) {
            extensions.add(compoundMatch[1]);
            continue;
        }

        // Then try single extension
        const singleMatch = cleanPattern.match(/(\.[a-zA-Z0-9]+)$/);
        if (singleMatch) {
            extensions.add(singleMatch[1]);
        }
    }

    return Array.from(extensions);
}

/**
 * Get the category for a set of extensions.
 *
 * @param {string[]} extensions - Array of file extensions
 * @returns {string|null} - Category name or null if no match
 */
export function getExtensionCategory(extensions) {
    if (!extensions || extensions.length === 0) return null;

    for (const [category, categoryExts] of Object.entries(EXTENSION_CATEGORIES)) {
        for (const ext of extensions) {
            // Direct match
            if (categoryExts.includes(ext)) {
                return category;
            }
            // AFNI pattern match (e.g., +orig.HEAD matches +orig.* pattern)
            if (category === 'afni' && (ext.startsWith('+orig') || ext.startsWith('+tlrc'))) {
                return category;
            }
        }
    }
    return null;
}

/**
 * Check if output extensions are compatible with input accepted extensions.
 * Returns compatibility result with optional warning message.
 *
 * @param {string[]} outputExtensions - Extensions from the output glob patterns
 * @param {string[]} inputAcceptedExtensions - Extensions the input accepts
 * @returns {{compatible: boolean, warning?: boolean, reason?: string}}
 */
export function checkExtensionCompatibility(outputExtensions, inputAcceptedExtensions) {
    // Graceful fallback: if either is missing, allow connection with optional warning
    if (!outputExtensions || outputExtensions.length === 0) {
        return { compatible: true, warning: true, reason: 'Output extension unknown' };
    }
    if (!inputAcceptedExtensions || inputAcceptedExtensions.length === 0) {
        return { compatible: true, warning: true, reason: 'Input accepts any file type' };
    }

    // Check for direct extension match
    const hasDirectMatch = outputExtensions.some((outExt) =>
        inputAcceptedExtensions.some((inExt) => {
            // Exact match
            if (outExt === inExt) return true;
            // AFNI wildcard match: +orig.HEAD matches +orig.*
            if (inExt.includes('*')) {
                const prefix = inExt.replace('*', '');
                return outExt.startsWith(prefix);
            }
            if (outExt.includes('*')) {
                const prefix = outExt.replace('*', '');
                return inExt.startsWith(prefix);
            }
            return false;
        }),
    );

    if (hasDirectMatch) {
        return { compatible: true };
    }

    // Check for category-based compatibility (cross-library)
    const outCategory = getExtensionCategory(outputExtensions);
    const inCategory = getExtensionCategory(inputAcceptedExtensions);

    if (outCategory && inCategory) {
        const compatibleWith = COMPATIBLE_CATEGORIES[outCategory] || [];
        if (compatibleWith.includes(inCategory)) {
            return {
                compatible: true,
                warning: true,
                reason: `Cross-format: ${outCategory} → ${inCategory}`,
            };
        }
    }

    // Not compatible - return mismatch info
    return {
        compatible: false,
        reason: `Extension mismatch: ${outputExtensions.join(', ')} → ${inputAcceptedExtensions.join(', ')}`,
    };
}
