/**
 * Static registry linking canvas labels to CWL tool definitions.
 *
 * Structure:
 * - id: short identifier for the tool
 * - cwlPath: path to CWL file relative to project root
 * - primaryOutputs: outputs that flow to downstream steps (usually main image files)
 * - requiredInputs: inputs that MUST be satisfied for valid CWL
 *   - type: CWL type (File, string, int, double, boolean)
 *   - passthrough: if true, receives upstream primaryOutput (or becomes workflow input for source nodes)
 *   - label: human-readable description
 * - optionalInputs: inputs that can be configured but aren't required
 *   - type, label, flag, bounds, exclusive, dependsOn, options as applicable
 * - outputs: all outputs the tool produces
 *   - type: CWL type (use 'File?' for nullable, 'File[]' for arrays)
 *   - label: human-readable description
 *   - glob: file patterns that match this output
 *   - requires: optional input that must be set for this output to be produced
 */

export const TOOL_MAP = {
    'bet': {
        id: 'bet',
        cwlPath: 'cwl/fsl/bet.cwl',
        primaryOutputs: ['brain_extraction'],

        requiredInputs: {
            input: {
                type: 'File',
                passthrough: true,
                label: 'Input T1-weighted image'
            },
            output: {
                type: 'string',
                label: 'Output filename'
            }
        },

        optionalInputs: {
            overlay: {
                type: 'boolean',
                label: 'Generate brain outline image',
                flag: '-o'
            },
            mask: {
                type: 'boolean',
                label: 'Generate binary brain mask image',
                flag: '-m'
            },
            skull: {
                type: 'boolean',
                label: 'Generate skull-stripped image',
                flag: '-s'
            },
            ngenerate: {
                type: 'boolean',
                label: 'Do not generate the default output',
                flag: '-n'
            },
            frac: {
                type: 'double',
                label: 'Fractional intensity threshold',
                flag: '-f',
                bounds: [0, 1]
            },
            vert_frac: {
                type: 'double',
                label: 'Vertical gradient in fractional intensity',
                flag: '-g',
                bounds: [-1, 1]
            },
            radius: {
                type: 'double',
                label: 'Radius of the brain centre in mm',
                flag: '-r'
            },
            cog: {
                type: 'string',
                label: 'Center of gravity vox coordinates (e.g. "90 110 75")',
                flag: '-c'
            },
            threshold: {
                type: 'boolean',
                label: 'Use thresholding to estimate the brain centre',
                flag: '-t'
            },
            mesh: {
                type: 'boolean',
                label: 'Generate a mesh of the brain surface',
                flag: '-e'
            },
            // Mutually exclusive options - wrapped in single 'exclusive' input in CWL
            // This is a record type where only one variant can be used
            exclusive: {
                type: 'record',
                label: 'Mutually exclusive BET modes (choose one)',
                variants: {
                    robust: { type: 'boolean', label: 'Use robust fitting', flag: '-R' },
                    eye: { type: 'boolean', label: 'Use eye mask', flag: '-S' },
                    bias: { type: 'boolean', label: 'Use bias field correction', flag: '-B' },
                    fov: { type: 'boolean', label: 'Use field of view', flag: '-Z' },
                    fmri: { type: 'boolean', label: 'Use fMRI mode', flag: '-F' },
                    betsurf: { type: 'boolean', label: 'Use BET surface mode', flag: '-A' },
                    betsurfT2: { type: 'File', label: 'Use BET surface mode for T2-weighted images', flag: '-A2' }
                }
            }
        },

        outputs: {
            brain_extraction: {
                type: 'File?',
                label: 'Extracted brain image',
                glob: ['$(inputs.output).nii', '$(inputs.output).nii.gz']
            },
            brain_mask: {
                type: 'File?',
                label: 'Binary brain mask',
                glob: ['$(inputs.output)_mask.nii.gz', '$(inputs.output)_mask.nii'],
                requires: 'mask'
            },
            brain_skull: {
                type: 'File?',
                label: 'Skull-stripped image',
                glob: ['$(inputs.output)_skull.nii.gz', '$(inputs.output)_skull.nii'],
                requires: 'skull'
            },
            brain_mesh: {
                type: 'File?',
                label: 'Brain surface mesh',
                glob: ['$(inputs.output)_mesh.vtk'],
                requires: 'mesh'
            },
            brain_registration: {
                type: 'File[]',
                label: 'Registration-related outputs',
                glob: [
                    '$(inputs.output)_inskull_*.*',
                    '$(inputs.output)_outskin_*.*',
                    '$(inputs.output)_outskull_*.*',
                    '$(inputs.output)_skull_mask.*'
                ]
            },
            log: {
                type: 'File',
                label: 'Log file',
                glob: ['$(inputs.output).log']
            }
        }
    },

    'fast': {
        id: 'fast',
        cwlPath: 'cwl/fsl/fast.cwl',
        primaryOutputs: ['segmented_files'],

        requiredInputs: {
            input: {
                type: 'File',
                passthrough: true,
                label: 'Input image (brain extracted recommended)'
            },
            output: {
                type: 'string',
                label: 'Output filename prefix'
            }
        },

        optionalInputs: {
            nclass: {
                type: 'int',
                label: 'Number of tissue classes',
                flag: '-n'
            },
            iterations: {
                type: 'int',
                label: 'Number of iterations during bias-field removal',
                flag: '-I'
            },
            lowpass: {
                type: 'double',
                label: 'Bias field smoothing extent (FWHM) in mm',
                flag: '-l'
            },
            image_type: {
                type: 'int',
                label: 'Image type (1=T1, 2=T2, 3=PD)',
                flag: '-t',
                options: [1, 2, 3]
            },
            fhard: {
                type: 'double',
                label: 'Initial segmentation spatial smoothness (during bias field estimation)',
                flag: '-f'
            },
            segments: {
                type: 'boolean',
                label: 'Output separate binary segmentation file for each tissue type',
                flag: '-g'
            },
            bias_field: {
                type: 'boolean',
                label: 'Output estimated bias field',
                flag: '-b'
            },
            bias_corrected_image: {
                type: 'boolean',
                label: 'Output bias-corrected image',
                flag: '-B'
            },
            nobias: {
                type: 'boolean',
                label: 'Do not remove bias field',
                flag: '-N'
            },
            channels: {
                type: 'int',
                label: 'Number of channels to use',
                flag: '-S'
            },
            initialization_iterations: {
                type: 'int',
                label: 'Initial number of segmentation-initialisation iterations',
                flag: '-W'
            },
            mixel: {
                type: 'double',
                label: 'Spatial smoothness for mixeltype',
                flag: '-R'
            },
            fixed: {
                type: 'int',
                label: 'Number of main-loop iterations after bias-field removal',
                flag: '-O'
            },
            hyper: {
                type: 'double',
                label: 'Segmentation spatial smoothness',
                flag: '-H'
            },
            manualseg: {
                type: 'File',
                label: 'Manual segmentation file',
                flag: '-s'
            },
            probability_maps: {
                type: 'boolean',
                label: 'Output individual probability maps',
                flag: '-p'
            },
            // Dependent parameters (priors) - these work together
            priors: {
                type: 'record',
                label: 'Prior initialization settings',
                variants: {
                    initialize_priors: { type: 'File', label: 'FLIRT transformation file for prior initialization', flag: '-a' },
                    use_priors: { type: 'boolean', label: 'Use priors', flag: '-P' }
                }
            }
        },

        outputs: {
            segmented_files: {
                type: 'File[]',
                label: 'Segmentation output files',
                glob: [
                    '$(inputs.output)_seg.nii.gz',
                    '$(inputs.output)_pve_*.nii.gz',
                    '$(inputs.output)_mixeltype.nii.gz',
                    '$(inputs.output)_pveseg.nii.gz'
                ]
            },
            output_bias_field: {
                type: 'File?',
                label: 'Estimated bias field',
                glob: ['$(inputs.output)_bias.nii.gz'],
                requires: 'bias_field'
            },
            output_bias_corrected_image: {
                type: 'File?',
                label: 'Bias-corrected image',
                glob: ['$(inputs.output)_restore.nii.gz'],
                requires: 'bias_corrected_image'
            },
            output_probability_maps: {
                type: 'File[]',
                label: 'Individual probability maps',
                glob: ['$(inputs.output)_prob_*.nii.gz'],
                requires: 'probability_maps'
            },
            output_segments: {
                type: 'File[]',
                label: 'Separate binary segmentation files',
                glob: ['$(inputs.output)_seg_*.nii.gz'],
                requires: 'segments'
            },
            log: {
                type: 'File',
                label: 'Log file',
                glob: ['$(inputs.output).log']
            }
        }
    }
};