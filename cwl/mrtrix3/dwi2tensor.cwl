#!/usr/bin/env cwl-runner

# https://mrtrix.readthedocs.io/en/latest/reference/commands/dwi2tensor.html
# Diffusion tensor estimation from DWI

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'dwi2tensor'

requirements:
  InlineJavascriptRequirement: {}

hints:
  DockerRequirement:
    dockerPull: mrtrix3/mrtrix3:latest

stdout: dwi2tensor.log
stderr: dwi2tensor.log

inputs:
  input:
    type: File
    label: Input DWI image
    inputBinding:
      position: 1
  output:
    type: string
    label: Output tensor image
    inputBinding:
      position: 2

  # Optional parameters
  mask:
    type: ['null', File]
    label: Processing mask
    inputBinding:
      prefix: -mask
  b0:
    type: ['null', string]
    label: Output mean b=0 image filename
    inputBinding:
      prefix: -b0
  dkt:
    type: ['null', string]
    label: Output diffusion kurtosis tensor filename
    inputBinding:
      prefix: -dkt
  ols:
    type: ['null', boolean]
    label: Use ordinary least squares estimator
    inputBinding:
      prefix: -ols
  iter:
    type: ['null', int]
    label: Number of iteratively-reweighted least squares iterations
    inputBinding:
      prefix: -iter

outputs:
  tensor:
    type: File
    outputBinding:
      glob: $(inputs.output)
  b0_image:
    type: ['null', File]
    outputBinding:
      glob: |
        ${
          if (inputs.b0) { return inputs.b0; }
          else { return "UNUSED_PLACEHOLDER_DO_NOT_MATCH"; }
        }
  kurtosis_tensor:
    type: ['null', File]
    outputBinding:
      glob: |
        ${
          if (inputs.dkt) { return inputs.dkt; }
          else { return "UNUSED_PLACEHOLDER_DO_NOT_MATCH"; }
        }
  log:
    type: File
    outputBinding:
      glob: dwi2tensor.log
