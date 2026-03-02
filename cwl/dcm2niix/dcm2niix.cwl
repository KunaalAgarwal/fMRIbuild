#!/usr/bin/env cwl-runner

# https://github.com/rordenlab/dcm2niix
# Convert DICOM images to NIfTI format with BIDS-compatible JSON sidecars

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'dcm2niix'

hints:
  DockerRequirement:
    dockerPull: xnat/dcm2niix:latest

stdout: dcm2niix.log
stderr: dcm2niix.log

arguments:
  - prefix: -o
    valueFrom: "."

inputs:
  input_dir:
    type: Directory
    label: Input DICOM directory
    inputBinding:
      position: 99
  filename:
    type: ['null', string]
    label: Output filename format (default %f_%p_%t_%s)
    inputBinding:
      prefix: -f
  compress:
    type:
      - 'null'
      - type: enum
        symbols: ['y', 'o', 'i', 'n', '3']
    label: Compression (y=pigz, o=optimal, i=internal, n=none, 3=save .nii and .gz)
    inputBinding: {prefix: -z}
  merge:
    type:
      - 'null'
      - type: enum
        symbols: ['0', '1', '2']
    label: Merge 2D slices (0=no, 1=yes, 2=auto)
    inputBinding: {prefix: -m}
  single_file:
    type:
      - 'null'
      - type: enum
        symbols: ['y', 'n']
    label: Single file mode for 4D (y/n)
    inputBinding: {prefix: -s}
  bids:
    type:
      - 'null'
      - type: enum
        symbols: ['y', 'n', 'o']
    label: BIDS sidecar (y=yes, n=no, o=only)
    inputBinding: {prefix: -b}
  anonymize:
    type:
      - 'null'
      - type: enum
        symbols: ['y', 'n']
    label: Anonymize BIDS sidecar (y/n)
    inputBinding: {prefix: -ba}
  ignore_derived:
    type: ['null', boolean]
    label: Ignore derived/localizer/2D images
    inputBinding:
      prefix: -i
      valueFrom: "y"
  verbose:
    type:
      - 'null'
      - type: enum
        symbols: ['0', '1', '2']
    label: Verbosity level (0=none, 1=some, 2=all)
    inputBinding: {prefix: -v}

outputs:
  nifti_files:
    type: File[]
    outputBinding:
      glob:
        - "*.nii.gz"
        - "*.nii"
  json_sidecars:
    type: File[]
    outputBinding:
      glob: "*.json"
  bval_files:
    type: File[]
    outputBinding:
      glob: "*.bval"
  bvec_files:
    type: File[]
    outputBinding:
      glob: "*.bvec"
  log:
    type: File
    outputBinding:
      glob: dcm2niix.log
