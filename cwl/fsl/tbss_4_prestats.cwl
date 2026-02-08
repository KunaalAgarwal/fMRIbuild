#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/TBSS/UserGuide
# TBSS step 4: pre-statistics thresholding

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'tbss_4_prestats'

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:latest

requirements:
  InitialWorkDirRequirement:
    listing:
      - entry: $(inputs.fa_directory)
        entryname: FA
        writable: true
      - entry: $(inputs.stats_directory)
        entryname: stats
        writable: true

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
  stats_directory:
    type: Directory
    label: stats directory from tbss_3_postreg

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
