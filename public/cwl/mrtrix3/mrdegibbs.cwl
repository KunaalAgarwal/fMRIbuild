#!/usr/bin/env cwl-runner

# https://mrtrix.readthedocs.io/en/latest/reference/commands/mrdegibbs.html
# Gibbs ringing removal

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'mrdegibbs'

hints:
  DockerRequirement:
    dockerPull: mrtrix3/mrtrix3:latest

stdout: mrdegibbs.log
stderr: mrdegibbs.log

inputs:
  input:
    type: File
    label: Input image
    inputBinding:
      position: 1
  output:
    type: string
    label: Output corrected image
    inputBinding:
      position: 2

  # Optional parameters
  axes:
    type: ['null', string]
    label: Slice axes (comma-separated, e.g., 0,1)
    inputBinding:
      prefix: -axes
  nshifts:
    type: ['null', int]
    label: Number of sub-voxel shifts
    inputBinding:
      prefix: -nshifts
  minW:
    type: ['null', int]
    label: Minimum window size
    inputBinding:
      prefix: -minW
  maxW:
    type: ['null', int]
    label: Maximum window size
    inputBinding:
      prefix: -maxW

outputs:
  degibbs:
    type: File
    outputBinding:
      glob: $(inputs.output)
  log:
    type: File
    outputBinding:
      glob: mrdegibbs.log
