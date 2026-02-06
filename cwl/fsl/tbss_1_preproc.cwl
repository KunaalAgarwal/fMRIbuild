#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/TBSS/UserGuide
# TBSS step 1: preprocessing FA images

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'tbss_1_preproc'

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:latest

stdout: tbss_1_preproc.log
stderr: tbss_1_preproc.log

inputs:
  fa_images:
    type: File[]
    label: Input FA images
    inputBinding:
      position: 1

outputs:
  FA_directory:
    type: Directory
    outputBinding:
      glob: FA
  log:
    type: File
    outputBinding:
      glob: tbss_1_preproc.log
