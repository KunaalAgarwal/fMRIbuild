#!/usr/bin/env cwl-runner

# https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dDWItoDT.html
# Fit diffusion tensor model to DWI data

cwlVersion: v1.2
class: CommandLineTool
baseCommand: '3dDWItoDT'

hints:
  DockerRequirement:
    dockerPull: brainlife/afni:latest

stdout: $(inputs.prefix).log
stderr: $(inputs.prefix).log

inputs:
  prefix:
    type: string
    label: Output dataset prefix
    inputBinding: {prefix: -prefix, position: 1}
  gradient_file:
    type: File
    label: Gradient vector file (3 columns per direction)
    inputBinding: {position: 98}
  input:
    type: File
    label: Input 4D DWI dataset
    inputBinding: {position: 99}

  # Optional parameters
  mask:
    type: ['null', File]
    label: Brain mask dataset
    inputBinding: {prefix: -mask}
  automask:
    type: ['null', boolean]
    label: Automatically compute brain mask from data
    inputBinding: {prefix: -automask}
  eigs:
    type: ['null', boolean]
    label: Output eigenvalues and eigenvectors
    inputBinding: {prefix: -eigs}
  debug_briks:
    type: ['null', boolean]
    label: Output additional debugging volumes
    inputBinding: {prefix: -debug_briks}
  cumulative_wts:
    type: ['null', boolean]
    label: Output cumulative weights
    inputBinding: {prefix: -cumulative_wts}
  nonlinear:
    type: ['null', boolean]
    label: Compute nonlinear tensor fit
    inputBinding: {prefix: -nonlinear}
  linear:
    type: ['null', boolean]
    label: Compute linear tensor fit (default)
    inputBinding: {prefix: -linear}
  sep_dsets:
    type: ['null', boolean]
    label: Output separate datasets for each DTI parameter (FA, MD, V1, etc.)
    inputBinding: {prefix: -sep_dsets}
  reweight:
    type: ['null', boolean]
    label: Reweight the data
    inputBinding: {prefix: -reweight}
  max_iter:
    type: ['null', int]
    label: Maximum number of iterations for nonlinear fit
    inputBinding: {prefix: -max_iter}
  max_iter_rw:
    type: ['null', int]
    label: Maximum iterations for reweight
    inputBinding: {prefix: -max_iter_rw}
  opt:
    type:
      - 'null'
      - type: enum
        symbols: [powell, simplex, nmsimplex]
    label: Optimization method for nonlinear
    inputBinding: {prefix: -opt}

outputs:
  tensor:
    type: File[]
    outputBinding:
      glob:
        - $(inputs.prefix)*+orig.HEAD
        - $(inputs.prefix)*+orig.BRIK
        - $(inputs.prefix)*+orig.BRIK.gz
        - $(inputs.prefix)*+tlrc.HEAD
        - $(inputs.prefix)*+tlrc.BRIK
        - $(inputs.prefix)*+tlrc.BRIK.gz
  log:
    type: File
    outputBinding:
      glob: $(inputs.prefix).log
