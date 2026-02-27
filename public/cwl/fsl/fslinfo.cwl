#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Fslutils
# Report basic image dimensions, voxel sizes, and data type

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'fslinfo'

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:latest

stdout: fslinfo_output.txt
stderr: fslinfo.log

inputs:
  input:
    type: File
    label: Input NIfTI image
    inputBinding:
      position: 1

outputs:
  image_info:
    type: File
    outputBinding:
      glob: fslinfo_output.txt
  log:
    type: File
    outputBinding:
      glob: fslinfo.log
