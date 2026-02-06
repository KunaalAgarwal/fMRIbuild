#!/usr/bin/env cwl-runner

# https://mrtrix.readthedocs.io/en/latest/reference/commands/dwi2fod.html
# Fibre orientation distribution estimation (CSD)

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'dwi2fod'

doc: |
  Positional constraint: GM and CSF tissue arguments are strictly positional.
  If you provide CSF inputs, you MUST also provide GM inputs. Skipping GM while
  providing CSF will cause the CSF arguments to shift into the GM positions,
  producing incorrect results.

requirements:
  InlineJavascriptRequirement: {}

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
    label: Grey matter response (required before CSF)
    inputBinding:
      position: 5
  gm_fod:
    type: ['null', string]
    label: Output GM FOD filename (required before CSF)
    inputBinding:
      position: 6
  csf_response:
    type: ['null', File]
    label: CSF response (requires GM inputs)
    inputBinding:
      position: 7
  csf_fod:
    type: ['null', string]
    label: Output CSF FOD filename (requires GM inputs)
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
      glob: |
        ${
          if (inputs.gm_fod) { return inputs.gm_fod; }
          else { return "UNUSED_PLACEHOLDER_DO_NOT_MATCH"; }
        }
  csf_fod_image:
    type: ['null', File]
    outputBinding:
      glob: |
        ${
          if (inputs.csf_fod) { return inputs.csf_fod; }
          else { return "UNUSED_PLACEHOLDER_DO_NOT_MATCH"; }
        }
  log:
    type: File
    outputBinding:
      glob: dwi2fod.log
