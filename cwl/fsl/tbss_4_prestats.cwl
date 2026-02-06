#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/TBSS/UserGuide
# TBSS step 4: pre-statistics thresholding

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'tbss_4_prestats'

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:latest

stdout: tbss_4_prestats.log
stderr: tbss_4_prestats.log

inputs:
  threshold:
    type: double
    label: FA threshold for skeleton (e.g., 0.2)
    inputBinding:
      position: 1
  fa_directory:
    type: Directory
    label: FA directory from tbss_3_postreg
    inputBinding:
      position: 2

outputs:
  all_FA_skeletonised:
    type: File
    outputBinding:
      glob:
        - stats/all_FA_skeletonised.nii.gz
  log:
    type: File
    outputBinding:
      glob: tbss_4_prestats.log
