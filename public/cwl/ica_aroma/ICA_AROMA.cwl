#!/usr/bin/env cwl-runner

# https://github.com/maartenmennes/ICA-AROMA
# Automatic removal of motion artifacts from fMRI data using ICA

cwlVersion: v1.2
class: CommandLineTool

requirements:
  ShellCommandRequirement: {}

baseCommand: []
arguments:
  - valueFrom: "mkdir -p $(inputs.output_dir) && python /home/aroma/icaaroma/tests/ICA_AROMA.py"
    position: 0
    shellQuote: false

hints:
  DockerRequirement:
    dockerPull: rtrhd/ica-aroma:latest

stdout: ICA_AROMA.log
stderr: ICA_AROMA.log

inputs:
  input:
    type: File
    label: Input 4D fMRI data (preprocessed, in standard space)
    inputBinding:
      prefix: -i
      position: 1
  output_dir:
    type: string
    label: Output directory
    inputBinding:
      prefix: -o
      position: 2
  mc:
    type: File
    label: Motion parameters file (6 columns)
    inputBinding:
      prefix: -mc
      position: 3

  # Registration inputs
  affmat:
    type: ['null', File]
    label: Affine registration matrix (func to MNI)
    inputBinding:
      prefix: -a
  warp:
    type: ['null', File]
    label: Non-linear warp field (func to MNI)
    inputBinding:
      prefix: -w

  # Optional parameters
  mask:
    type: ['null', File]
    label: Brain mask in functional space
    inputBinding:
      prefix: -m
  denoise_type:
    type:
      - 'null'
      - type: enum
        symbols: [nonaggr, aggr, both]
    label: Denoising strategy (nonaggr=non-aggressive, aggr=aggressive, both)
    inputBinding: {prefix: -den}
  melodic_dir:
    type: ['null', Directory]
    label: Pre-computed MELODIC directory (skip ICA step)
    inputBinding:
      prefix: -md
  dim:
    type: ['null', int]
    label: Dimensionality for MELODIC (default auto)
    inputBinding:
      prefix: -dim
  TR:
    type: ['null', double]
    label: TR in seconds (extracted from data if not provided)
    inputBinding:
      prefix: -tr

outputs:
  output_directory:
    type: Directory
    outputBinding:
      glob: $(inputs.output_dir)
  denoised_func:
    type: File
    outputBinding:
      glob:
        - $(inputs.output_dir)/denoised_func_data_nonaggr.nii.gz
        - $(inputs.output_dir)/denoised_func_data_aggr.nii.gz
        - $(inputs.output_dir)/denoised_func_data_nonaggr.nii
  classified_motion:
    type: ['null', File]
    outputBinding:
      glob: $(inputs.output_dir)/classified_motion_ICs.txt
  melodic_mixing:
    type: ['null', File]
    outputBinding:
      glob: $(inputs.output_dir)/melodic.ica/melodic_mix
  log:
    type: File
    outputBinding:
      glob: ICA_AROMA.log
