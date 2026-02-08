#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/TBSS/UserGuide
# TBSS step 2: registration to standard space

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'tbss_2_reg'

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:latest

requirements:
  InitialWorkDirRequirement:
    listing:
      - entry: $(inputs.fa_directory)
        entryname: FA
        writable: true

stdout: tbss_2_reg.log
stderr: tbss_2_reg.log

inputs:
  fa_directory:
    type: Directory
    label: FA directory from tbss_1_preproc

  # Optional parameters (mutually exclusive)
  use_fmrib_target:
    type: ['null', boolean]
    label: Use FMRIB58_FA standard-space image as target
    inputBinding:
      prefix: -T
  target_image:
    type: ['null', File]
    label: Use specified image as target
    inputBinding:
      prefix: -t
  find_best_target:
    type: ['null', boolean]
    label: Find best target from all subjects
    inputBinding:
      prefix: -n

outputs:
  FA_directory:
    type: Directory
    outputBinding:
      glob: FA
  log:
    type: File
    outputBinding:
      glob: tbss_2_reg.log
