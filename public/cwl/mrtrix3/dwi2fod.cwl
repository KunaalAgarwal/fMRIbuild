#!/usr/bin/env cwl-runner

# https://mrtrix.readthedocs.io/en/latest/reference/commands/dwi2fod.html
# Fibre orientation distribution estimation (CSD)

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'dwi2fod'

hints:
  DockerRequirement:
    dockerPull: mrtrix3/mrtrix3:latest

stdout: dwi2fod.log
stderr: dwi2fod.log

inputs:
  algorithm:
    type: string
    label: FOD algorithm (csd/msmt_csd)
    inputBinding:
      position: 1
  input:
    type: File
    label: Input DWI image
    inputBinding:
      position: 2
  wm_response:
    type: File
    label: White matter response function
    inputBinding:
      position: 3
  wm_fod:
    type: string
    label: Output WM FOD image filename
    inputBinding:
      position: 4

  # Optional multi-tissue outputs (for msmt_csd)
  gm_response:
    type: ['null', File]
    label: Grey matter response function
    inputBinding:
      position: 5
  gm_fod:
    type: ['null', string]
    label: Output GM FOD image filename
    inputBinding:
      position: 6
  csf_response:
    type: ['null', File]
    label: CSF response function
    inputBinding:
      position: 7
  csf_fod:
    type: ['null', string]
    label: Output CSF FOD image filename
    inputBinding:
      position: 8

  # Optional parameters
  mask:
    type: ['null', File]
    label: Processing mask
    inputBinding:
      prefix: -mask

outputs:
  wm_fod_image:
    type: File
    outputBinding:
      glob: $(inputs.wm_fod)
  gm_fod_image:
    type: ['null', File]
    outputBinding:
      glob: $(inputs.gm_fod)
  csf_fod_image:
    type: ['null', File]
    outputBinding:
      glob: $(inputs.csf_fod)
  log:
    type: File
    outputBinding:
      glob: dwi2fod.log
