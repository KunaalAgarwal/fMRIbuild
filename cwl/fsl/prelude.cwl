#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FUGUE/Guide#PRELUDE_.28phase_unwrapping.29
# Phase Region Expanding Labeller for Unwrapping Discrete Estimates

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'prelude'

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:latest

stdout: prelude.log
stderr: prelude.err.log

inputs:
  phase:
    type: File
    label: Wrapped phase image
    inputBinding:
      prefix: -p
  magnitude:
    type: ['null', File]
    label: Magnitude image (for masking)
    inputBinding:
      prefix: -a
  complex_input:
    type: ['null', File]
    label: Complex input image (alternative to phase/magnitude pair)
    inputBinding:
      prefix: -c
  output:
    type: string
    label: Output unwrapped phase image
    inputBinding:
      prefix: -o
  mask:
    type: ['null', File]
    label: Brain mask image
    inputBinding:
      prefix: -m

  num_partitions:
    type: ['null', int]
    label: Number of phase partitions for initial labeling
    inputBinding:
      prefix: -n
  process2d:
    type: ['null', boolean]
    label: Do 2D processing (slice by slice)
    inputBinding:
      prefix: -s
  labelslices:
    type: ['null', boolean]
    label: 2D labeling with 3D unwrapping
    inputBinding:
      prefix: --labelslices
  force3d:
    type: ['null', boolean]
    label: Force full 3D processing
    inputBinding:
      prefix: --force3D
  removeramps:
    type: ['null', boolean]
    label: Remove phase ramps during unwrapping
    inputBinding:
      prefix: --removeramps
  savemask:
    type: ['null', string]
    label: Save the generated mask volume
    inputBinding:
      prefix: --savemask=
      separate: false
  verbose:
    type: ['null', boolean]
    label: Verbose output
    inputBinding:
      prefix: -v

outputs:
  unwrapped_phase:
    type: File
    outputBinding:
      glob:
        - $(inputs.output).nii.gz
        - $(inputs.output).nii
        - $(inputs.output)
  saved_mask:
    type: ['null', File]
    outputBinding:
      glob:
        - $(inputs.savemask).nii.gz
        - $(inputs.savemask).nii
  log:
    type: File
    outputBinding:
      glob: prelude.log
  err_log:
    type: File
    outputBinding:
      glob: prelude.err.log
