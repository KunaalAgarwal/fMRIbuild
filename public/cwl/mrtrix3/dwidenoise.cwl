#!/usr/bin/env cwl-runner

# https://mrtrix.readthedocs.io/en/latest/reference/commands/dwidenoise.html
# MP-PCA denoising of DWI data

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'dwidenoise'

hints:
  DockerRequirement:
    dockerPull: mrtrix3/mrtrix3:latest

stdout: dwidenoise.log
stderr: dwidenoise.log

inputs:
  input:
    type: File
    label: Input DWI image
    inputBinding:
      position: 1
  output:
    type: string
    label: Output denoised image
    inputBinding:
      position: 2

  # Optional parameters
  noise:
    type: ['null', string]
    label: Output noise map filename
    inputBinding:
      prefix: -noise
  extent:
    type: ['null', string]
    label: Sliding window extent (e.g., 5,5,5)
    inputBinding:
      prefix: -extent
  mask:
    type: ['null', File]
    label: Processing mask
    inputBinding:
      prefix: -mask

outputs:
  denoised:
    type: File
    outputBinding:
      glob: $(inputs.output)
  noise_map:
    type: ['null', File]
    outputBinding:
      glob: $(inputs.noise)
  log:
    type: File
    outputBinding:
      glob: dwidenoise.log
