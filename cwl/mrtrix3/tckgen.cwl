#!/usr/bin/env cwl-runner

# https://mrtrix.readthedocs.io/en/latest/reference/commands/tckgen.html
# Streamline tractography generation

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'tckgen'

hints:
  DockerRequirement:
    dockerPull: mrtrix3/mrtrix3:latest

stdout: tckgen.log
stderr: tckgen.log

inputs:
  source:
    type: File
    label: Input FOD or tensor image
    inputBinding:
      position: 1
  output:
    type: string
    label: Output tractogram filename
    inputBinding:
      position: 2

  # Optional parameters
  algorithm:
    type: ['null', string]
    label: Tracking algorithm (iFOD2/Tensor_Det/Tensor_Prob)
    inputBinding:
      prefix: -algorithm
  seed_image:
    type: ['null', File]
    label: Seed image for tractography
    inputBinding:
      prefix: -seed_image
  select:
    type: ['null', int]
    label: Number of streamlines to select
    inputBinding:
      prefix: -select
  cutoff:
    type: ['null', double]
    label: FOD amplitude cutoff for termination
    inputBinding:
      prefix: -cutoff
  act:
    type: ['null', File]
    label: ACT tissue-segmented image
    inputBinding:
      prefix: -act
  step:
    type: ['null', double]
    label: Step size (mm)
    inputBinding:
      prefix: -step
  angle:
    type: ['null', double]
    label: Maximum angle between steps (degrees)
    inputBinding:
      prefix: -angle
  maxlength:
    type: ['null', double]
    label: Maximum streamline length (mm)
    inputBinding:
      prefix: -maxlength

outputs:
  tractogram:
    type: File
    outputBinding:
      glob: $(inputs.output)
  log:
    type: File
    outputBinding:
      glob: tckgen.log
