#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/oxford_asl
# Complete ASL processing pipeline

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'oxford_asl'

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:latest

stdout: oxford_asl.log
stderr: oxford_asl.log

inputs:
  input:
    type: File
    label: Input ASL data
    inputBinding:
      prefix: -i
      position: 1
  output_dir:
    type: string
    label: Output directory name
    inputBinding:
      prefix: -o
      position: 2

  # Optional parameters
  structural:
    type: ['null', File]
    label: Structural (T1) image
    inputBinding:
      prefix: -s
  casl:
    type: ['null', boolean]
    label: Data is CASL/pCASL (continuous ASL)
    inputBinding:
      prefix: --casl
  pasl:
    type: ['null', boolean]
    label: Data is PASL (pulsed ASL)
    inputBinding:
      prefix: --pasl
  iaf:
    type: ['null', string]
    label: Input ASL format (tc/ct/diff)
    inputBinding:
      prefix: --iaf
  tis:
    type: ['null', string]
    label: Inversion times (comma-separated)
    inputBinding:
      prefix: --tis
  bolus:
    type: ['null', double]
    label: Bolus duration (seconds)
    inputBinding:
      prefix: --bolus
  bat:
    type: ['null', double]
    label: Bolus arrival time (seconds)
    inputBinding:
      prefix: --bat
  calib:
    type: ['null', File]
    label: Calibration (M0) image
    inputBinding:
      prefix: -c
  wp:
    type: ['null', boolean]
    label: Use white paper quantification
    inputBinding:
      prefix: --wp

outputs:
  output_directory:
    type: Directory
    outputBinding:
      glob: $(inputs.output_dir)
  perfusion:
    type: ['null', File]
    outputBinding:
      glob:
        - $(inputs.output_dir)/native_space/perfusion.nii.gz
  arrival:
    type: ['null', File]
    outputBinding:
      glob:
        - $(inputs.output_dir)/native_space/arrival.nii.gz
  log:
    type: File
    outputBinding:
      glob: oxford_asl.log
