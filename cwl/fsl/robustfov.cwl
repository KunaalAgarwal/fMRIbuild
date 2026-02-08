#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/fsl_anat
# Robust field of view reduction

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'robustfov'

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:latest

stdout: robustfov.log
stderr: robustfov.err.log

inputs:
  input:
    type: File
    label: Input image (full head coverage)
    inputBinding:
      prefix: -i
  output:
    type: string
    label: Output cropped image filename
    inputBinding:
      prefix: -r
  matrix_output:
    type: ['null', string]
    label: Output transformation matrix filename
    inputBinding:
      prefix: -m
  brain_size:
    type: ['null', int]
    label: Brain size estimate in mm (default 170)
    inputBinding:
      prefix: -b

outputs:
  cropped_image:
    type: File
    outputBinding:
      glob:
        - $(inputs.output).nii.gz
        - $(inputs.output).nii
        - $(inputs.output)
  transform_matrix:
    type: ['null', File]
    outputBinding:
      glob: $(inputs.matrix_output)
  log:
    type: File
    outputBinding:
      glob: robustfov.log
  err_log:
    type: File
    outputBinding:
      glob: robustfov.err.log
