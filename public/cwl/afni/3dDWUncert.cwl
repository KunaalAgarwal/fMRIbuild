#!/usr/bin/env cwl-runner

# https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dDWUncert.html
# Estimate uncertainty of diffusion tensor parameters

cwlVersion: v1.2
class: CommandLineTool
baseCommand: '3dDWUncert'

hints:
  DockerRequirement:
    dockerPull: brainlife/afni:latest

stdout: $(inputs.prefix).log
stderr: $(inputs.prefix).log

inputs:
  inset:
    type: File
    label: Input DWI 4D dataset
    inputBinding: {prefix: -inset}
  prefix:
    type: string
    label: Output dataset prefix
    inputBinding: {prefix: -prefix}
  grads:
    type: File
    label: Gradient vector file
    inputBinding: {prefix: -grads}
  mask:
    type: ['null', File]
    label: Brain mask dataset
    inputBinding: {prefix: -mask}
  iters:
    type: ['null', int]
    label: Number of jackknife/bootstrap iterations (default 300)
    inputBinding: {prefix: -iters}
  pt_choose_seed:
    type: ['null', int]
    label: Seed for random number generator
    inputBinding: {prefix: -pt_choose_seed}

outputs:
  uncertainty:
    type: File[]
    outputBinding:
      glob:
        - $(inputs.prefix)+orig.HEAD
        - $(inputs.prefix)+orig.BRIK
        - $(inputs.prefix)+tlrc.HEAD
        - $(inputs.prefix)+tlrc.BRIK
  log:
    type: File
    outputBinding:
      glob: $(inputs.prefix).log
