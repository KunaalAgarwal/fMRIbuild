#!/usr/bin/env cwl-runner

# https://mrtrix.readthedocs.io/en/latest/reference/commands/tensor2metric.html
# Extract quantitative metrics from diffusion tensors

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'tensor2metric'

requirements:
  InlineJavascriptRequirement: {}

hints:
  DockerRequirement:
    dockerPull: mrtrix3/mrtrix3:latest

stdout: tensor2metric.log
stderr: tensor2metric.log

inputs:
  input:
    type: File
    label: Input tensor image
    inputBinding:
      position: 1

  # Optional parameters
  fa:
    type: ['null', string]
    label: Output FA map filename
    inputBinding:
      prefix: -fa
  adc:
    type: ['null', string]
    label: Output mean diffusivity (ADC) map filename
    inputBinding:
      prefix: -adc
  ad:
    type: ['null', string]
    label: Output axial diffusivity map filename
    inputBinding:
      prefix: -ad
  rd:
    type: ['null', string]
    label: Output radial diffusivity map filename
    inputBinding:
      prefix: -rd
  vector:
    type: ['null', string]
    label: Output eigenvector map filename
    inputBinding:
      prefix: -vector
  value:
    type: ['null', string]
    label: Output eigenvalue map filename
    inputBinding:
      prefix: -value
  mask:
    type: ['null', File]
    label: Processing mask
    inputBinding:
      prefix: -mask

outputs:
  fa_map:
    type: ['null', File]
    outputBinding:
      glob: |
        ${
          if (inputs.fa) { return inputs.fa; }
          else { return "UNUSED_PLACEHOLDER_DO_NOT_MATCH"; }
        }
  md_map:
    type: ['null', File]
    outputBinding:
      glob: |
        ${
          if (inputs.adc) { return inputs.adc; }
          else { return "UNUSED_PLACEHOLDER_DO_NOT_MATCH"; }
        }
  ad_map:
    type: ['null', File]
    outputBinding:
      glob: |
        ${
          if (inputs.ad) { return inputs.ad; }
          else { return "UNUSED_PLACEHOLDER_DO_NOT_MATCH"; }
        }
  rd_map:
    type: ['null', File]
    outputBinding:
      glob: |
        ${
          if (inputs.rd) { return inputs.rd; }
          else { return "UNUSED_PLACEHOLDER_DO_NOT_MATCH"; }
        }
  log:
    type: File
    outputBinding:
      glob: tensor2metric.log
