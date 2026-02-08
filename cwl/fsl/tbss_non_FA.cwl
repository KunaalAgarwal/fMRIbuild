#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/TBSS/UserGuide#Using_non-FA_Images_in_TBSS
# TBSS step 5: project non-FA data onto the FA skeleton

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'tbss_non_FA'

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

stdout: tbss_non_FA.log
stderr: tbss_non_FA.err.log

inputs:
  measure:
    type: string
    label: Non-FA measure name (e.g., MD, AD, RD, L1, L2, L3)
    inputBinding:
      position: 1
  fa_directory:
    type: Directory
    label: FA directory from TBSS pipeline
  stats_directory:
    type: Directory
    label: stats directory containing all_<measure>.nii.gz

outputs:
  skeletonised_data:
    type: File
    outputBinding:
      glob:
        - stats/all_$(inputs.measure)_skeletonised.nii.gz
  log:
    type: File
    outputBinding:
      glob: tbss_non_FA.log
  err_log:
    type: File
    outputBinding:
      glob: tbss_non_FA.err.log
