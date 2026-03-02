#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Fslutils
# Report header information for a NIfTI image

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'fslhd'

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:latest

stdout: fslhd_output.txt
stderr: fslhd.log

inputs:
  input:
    type: File
    label: Input NIfTI image
    inputBinding:
      position: 1
  xml:
    type: ['null', boolean]
    label: Output in XML format
    inputBinding:
      prefix: -x
      position: 0

outputs:
  header_info:
    type: File
    outputBinding:
      glob: fslhd_output.txt
  log:
    type: File
    outputBinding:
      glob: fslhd.log
