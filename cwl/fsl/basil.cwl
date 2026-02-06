#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/BASIL
# Bayesian inference for ASL MRI

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'basil'

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:latest

stdout: basil.log
stderr: basil.log

inputs:
  input:
    type: File
    label: Input ASL difference data
    inputBinding:
      prefix: -i
      position: 1
  output_dir:
    type: string
    label: Output directory name
    inputBinding:
      prefix: -o
      position: 2

  # Optional parameters
  casl:
    type: ['null', boolean]
    label: Data is CASL/pCASL
    inputBinding:
      prefix: --casl
  pasl:
    type: ['null', boolean]
    label: Data is PASL
    inputBinding:
      prefix: --pasl
  tis:
    type: ['null', string]
    label: Inversion times (comma-separated)
    inputBinding:
      prefix: --tis
  bolus:
    type: ['null', double]
    label: Bolus duration (seconds)
    inputBinding:
      prefix: --bolus
  bat:
    type: ['null', double]
    label: Bolus arrival time (seconds)
    inputBinding:
      prefix: --bat
  mask:
    type: ['null', File]
    label: Brain mask
    inputBinding:
      prefix: -m
  spatial:
    type: ['null', boolean]
    label: Use spatial regularisation
    inputBinding:
      prefix: --spatial

outputs:
  output_directory:
    type: Directory
    outputBinding:
      glob: $(inputs.output_dir)
  perfusion:
    type: ['null', File]
    outputBinding:
      glob:
        - $(inputs.output_dir)/mean_ftiss.nii.gz
  log:
    type: File
    outputBinding:
      glob: basil.log
