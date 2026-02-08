#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FUGUE/Guide#SIEMENS_data
# Prepare fieldmap for use with FUGUE

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'fsl_prepare_fieldmap'

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:latest

stdout: fsl_prepare_fieldmap.log
stderr: fsl_prepare_fieldmap.err.log

inputs:
  scanner:
    type: string
    label: Scanner type (e.g., SIEMENS)
    inputBinding:
      position: 1
  phase_image:
    type: File
    label: Phase difference image
    inputBinding:
      position: 2
  magnitude_image:
    type: File
    label: Brain-extracted magnitude image
    inputBinding:
      position: 3
  output:
    type: string
    label: Output fieldmap filename
    inputBinding:
      position: 4
  delta_TE:
    type: double
    label: Echo time difference in milliseconds
    inputBinding:
      position: 5
  nocheck:
    type: ['null', boolean]
    label: Suppress sanity checking of image size/range/dimensions
    inputBinding:
      prefix: --nocheck

outputs:
  fieldmap:
    type: File
    outputBinding:
      glob:
        - $(inputs.output).nii.gz
        - $(inputs.output).nii
        - $(inputs.output)
  log:
    type: File
    outputBinding:
      glob: fsl_prepare_fieldmap.log
  err_log:
    type: File
    outputBinding:
      glob: fsl_prepare_fieldmap.err.log
