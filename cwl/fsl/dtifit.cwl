#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FDT/UserGuide#DTIFIT
# Diffusion tensor fitting

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'dtifit'

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:latest

stdout: dtifit.log
stderr: dtifit.log

inputs:
  data:
    type: File
    label: Input diffusion data
    inputBinding:
      prefix: -k
      position: 1
  mask:
    type: File
    label: Brain mask
    inputBinding:
      prefix: -m
      position: 2
  bvecs:
    type: File
    label: b-vectors file
    inputBinding:
      prefix: -r
      position: 3
  bvals:
    type: File
    label: b-values file
    inputBinding:
      prefix: -b
      position: 4
  output:
    type: string
    label: Output basename
    inputBinding:
      prefix: -o
      position: 5

  # Optional parameters
  wls:
    type: ['null', boolean]
    label: Use weighted least squares
    inputBinding:
      prefix: -w
  sse:
    type: ['null', boolean]
    label: Output sum of squared errors
    inputBinding:
      prefix: --sse
  save_tensor:
    type: ['null', boolean]
    label: Save tensor elements
    inputBinding:
      prefix: --save_tensor

outputs:
  FA:
    type: File
    outputBinding:
      glob:
        - $(inputs.output)_FA.nii.gz
        - $(inputs.output)_FA.nii
  MD:
    type: File
    outputBinding:
      glob:
        - $(inputs.output)_MD.nii.gz
        - $(inputs.output)_MD.nii
  L1:
    type: ['null', File]
    outputBinding:
      glob:
        - $(inputs.output)_L1.nii.gz
        - $(inputs.output)_L1.nii
  L2:
    type: ['null', File]
    outputBinding:
      glob:
        - $(inputs.output)_L2.nii.gz
        - $(inputs.output)_L2.nii
  L3:
    type: ['null', File]
    outputBinding:
      glob:
        - $(inputs.output)_L3.nii.gz
        - $(inputs.output)_L3.nii
  V1:
    type: ['null', File]
    outputBinding:
      glob:
        - $(inputs.output)_V1.nii.gz
        - $(inputs.output)_V1.nii
  V2:
    type: ['null', File]
    outputBinding:
      glob:
        - $(inputs.output)_V2.nii.gz
        - $(inputs.output)_V2.nii
  V3:
    type: ['null', File]
    outputBinding:
      glob:
        - $(inputs.output)_V3.nii.gz
        - $(inputs.output)_V3.nii
  tensor:
    type: ['null', File]
    outputBinding:
      glob:
        - $(inputs.output)_tensor.nii.gz
        - $(inputs.output)_tensor.nii
  log:
    type: File
    outputBinding:
      glob: dtifit.log
