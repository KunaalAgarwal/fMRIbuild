#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/topup/ApplyTopupUsersGuide
# Apply topup distortion correction to EPI images

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'applytopup'

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:latest

stdout: applytopup.log
stderr: applytopup.err.log

inputs:
  input:
    type: File
    label: Input image(s) to correct
    inputBinding:
      prefix: --imain=
      separate: false
  topup_prefix:
    type: string
    label: Basename of the topup output (field coefficients)
    inputBinding:
      prefix: --topup=
      separate: false
  encoding_file:
    type: File
    label: Acquisition parameters file (same as used for topup)
    inputBinding:
      prefix: --datain=
      separate: false
  inindex:
    type: string
    label: Comma-separated indices into encoding_file for each input image
    inputBinding:
      prefix: --inindex=
      separate: false
  output:
    type: string
    label: Output basename for corrected images
    inputBinding:
      prefix: --out=
      separate: false

  method:
    type:
      - 'null'
      - type: enum
        symbols: [jac, lsr]
    label: Resampling method (jac=Jacobian, lsr=least-squares)
    inputBinding:
      prefix: --method=
      separate: false
  interp:
    type:
      - 'null'
      - type: enum
        symbols: [trilinear, spline]
    label: Interpolation method (only for method=jac)
    inputBinding:
      prefix: --interp=
      separate: false
  datatype:
    type:
      - 'null'
      - type: enum
        symbols: [char, short, int, float, double]
    label: Force output data type
    inputBinding:
      prefix: --datatype=
      separate: false
  verbose:
    type: ['null', boolean]
    label: Verbose output
    inputBinding:
      prefix: -v

outputs:
  corrected_images:
    type: File
    outputBinding:
      glob:
        - $(inputs.output).nii.gz
        - $(inputs.output).nii
  log:
    type: File
    outputBinding:
      glob: applytopup.log
  err_log:
    type: File
    outputBinding:
      glob: applytopup.err.log
