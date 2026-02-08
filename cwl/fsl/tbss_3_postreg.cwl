#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/TBSS/UserGuide
# TBSS step 3: post-registration processing

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'tbss_3_postreg'

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:latest

requirements:
  InitialWorkDirRequirement:
    listing:
      - entry: $(inputs.fa_directory)
        entryname: FA
        writable: true

stdout: tbss_3_postreg.log
stderr: tbss_3_postreg.log

inputs:
  fa_directory:
    type: Directory
    label: FA directory from tbss_2_reg

  # Optional parameters (mutually exclusive)
  study_specific:
    type: ['null', boolean]
    label: Derive mean FA and skeleton from study data
    inputBinding:
      prefix: -S
  use_fmrib:
    type: ['null', boolean]
    label: Use FMRIB58_FA mean FA and skeleton
    inputBinding:
      prefix: -T

outputs:
  mean_FA:
    type: File
    outputBinding:
      glob:
        - stats/mean_FA.nii.gz
  mean_FA_skeleton:
    type: File
    outputBinding:
      glob:
        - stats/mean_FA_skeleton.nii.gz
  all_FA:
    type: File
    outputBinding:
      glob:
        - stats/all_FA.nii.gz
  FA_directory:
    type: Directory
    outputBinding:
      glob: FA
  stats_directory:
    type: Directory
    outputBinding:
      glob: stats
  log:
    type: File
    outputBinding:
      glob: tbss_3_postreg.log
