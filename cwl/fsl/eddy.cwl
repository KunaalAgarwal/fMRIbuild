#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/eddy
# Eddy current and motion correction for diffusion data

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'eddy'

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:6.0.4-patched2
  ResourceRequirement:
    ramMin: 4096
    coresMin: 1

stdout: eddy.log
stderr: eddy_stderr.log

inputs:
  input:
    type: File
    label: Input DWI image
    inputBinding:
      prefix: --imain=
      separate: false
      position: 1
  bvals:
    type: File
    label: b-values file
    inputBinding:
      prefix: --bvals=
      separate: false
      position: 2
  bvecs:
    type: File
    label: b-vectors file
    inputBinding:
      prefix: --bvecs=
      separate: false
      position: 3
  acqp:
    type: File
    label: Acquisition parameters file
    inputBinding:
      prefix: --acqp=
      separate: false
      position: 4
  index:
    type: File
    label: Index file mapping volumes to acquisition parameters
    inputBinding:
      prefix: --index=
      separate: false
      position: 5
  mask:
    type: File
    label: Brain mask
    inputBinding:
      prefix: --mask=
      separate: false
      position: 6
  output:
    type: string
    label: Output basename
    inputBinding:
      prefix: --out=
      separate: false
      position: 7

  # Optional parameters
  topup:
    type: ['null', string]
    label: Topup results basename
    inputBinding:
      prefix: --topup=
      separate: false
  repol:
    type: ['null', boolean]
    label: Detect and replace outlier slices
    inputBinding:
      prefix: --repol
  slm:
    type: ['null', string]
    label: Second level model (none/linear/quadratic)
    inputBinding:
      prefix: --slm=
      separate: false
  niter:
    type: ['null', int]
    label: Number of iterations
    inputBinding:
      prefix: --niter=
      separate: false
  fwhm:
    type: ['null', string]
    label: FWHM for conditioning regularisation (comma-separated)
    inputBinding:
      prefix: --fwhm=
      separate: false
  flm:
    type: ['null', string]
    label: First level EC model (movement/linear/quadratic/cubic)
    inputBinding:
      prefix: --flm=
      separate: false
  interp:
    type: ['null', string]
    label: Interpolation model (spline/trilinear)
    inputBinding:
      prefix: --interp=
      separate: false
  dont_sep_offs_move:
    type: ['null', boolean]
    label: Do not separate field offset from subject movement
    inputBinding:
      prefix: --dont_sep_offs_move
  nvoxhp:
    type: ['null', int]
    label: Number of voxels for hyperparameter estimation (default 1000)
    inputBinding:
      prefix: --nvoxhp=
      separate: false
  data_is_shelled:
    type: ['null', boolean]
    label: Assume data is shelled (skip check)
    inputBinding:
      prefix: --data_is_shelled

outputs:
  corrected_image:
    type: File
    outputBinding:
      glob:
        - $(inputs.output).nii.gz
        - $(inputs.output).nii
  rotated_bvecs:
    type: File
    outputBinding:
      glob: $(inputs.output).eddy_rotated_bvecs
  parameters:
    type: File
    outputBinding:
      glob: $(inputs.output).eddy_parameters
  log:
    type: File
    outputBinding:
      glob: eddy.log
