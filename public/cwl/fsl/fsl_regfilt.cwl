#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/fsl_regfilt
# Data de-noising by regressing out specified components from a design matrix

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'fsl_regfilt'

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:latest

stdout: fsl_regfilt.log
stderr: fsl_regfilt.log

inputs:
  input:
    type: File
    label: Input 4D data file
    inputBinding:
      prefix: -i
      position: 1
  design:
    type: File
    label: Design matrix (e.g., MELODIC mixing matrix)
    inputBinding:
      prefix: -d
      position: 2
  output:
    type: string
    label: Output filename
    inputBinding:
      prefix: -o
      position: 3
  filter:
    type: string
    label: Component indices to filter out (comma-separated, 1-indexed)
    inputBinding:
      prefix: -f
      position: 4

  # Optional parameters
  aggressive:
    type: ['null', boolean]
    label: Use aggressive (full variance) filtering
    inputBinding:
      prefix: -a
  freq_filter:
    type: ['null', boolean]
    label: Frequency-based filtering
    inputBinding:
      prefix: --freq
  freq_ic:
    type: ['null', File]
    label: Frequency IC file for frequency-based filtering
    inputBinding:
      prefix: --freq_ic
  verbose:
    type: ['null', boolean]
    label: Verbose output
    inputBinding:
      prefix: -v
  mask:
    type: ['null', File]
    label: Brain mask
    inputBinding:
      prefix: -m

outputs:
  filtered_data:
    type: File
    outputBinding:
      glob:
        - $(inputs.output).nii.gz
        - $(inputs.output).nii
        - $(inputs.output)
  log:
    type: File
    outputBinding:
      glob: fsl_regfilt.log
