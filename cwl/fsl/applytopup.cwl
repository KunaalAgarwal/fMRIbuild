#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/topup/ApplyTopupUsersGuide
# Apply topup distortion correction to EPI images

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'applytopup'

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:latest

requirements:
  InlineJavascriptRequirement: {}
  InitialWorkDirRequirement:
    listing:
      - entryname: $(inputs.topup_fieldcoef.basename)
        entry: $(inputs.topup_fieldcoef)
      - entryname: $(inputs.topup_movpar.basename)
        entry: $(inputs.topup_movpar)

stdout: applytopup.log
stderr: applytopup.err.log

inputs:
  input:
    type: File
    label: Input image(s) to correct
    inputBinding:
      prefix: --imain=
      separate: false
  topup_fieldcoef:
    type: File
    label: Topup field coefficients file (_fieldcoef.nii.gz from topup)
  topup_movpar:
    type: File
    label: Topup movement parameters file (_movpar.txt from topup)
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

arguments:
  - prefix: --topup=
    separate: false
    valueFrom: $(inputs.topup_fieldcoef.basename.replace(/_fieldcoef\.nii\.gz$|_fieldcoef\.nii$/, ''))

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
