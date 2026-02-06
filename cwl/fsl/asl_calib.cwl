#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/oxford_asl
# ASL calibration to absolute CBF units

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'asl_calib'

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:latest

stdout: asl_calib.log
stderr: asl_calib.log

inputs:
  perfusion:
    type: File
    label: Input perfusion image (relative units)
    inputBinding:
      prefix: -i
      position: 1
  calib_image:
    type: File
    label: Calibration (M0) image
    inputBinding:
      prefix: -c
      position: 2
  output:
    type: string
    label: Output filename
    inputBinding:
      prefix: -o
      position: 3

  # Optional parameters
  structural:
    type: ['null', File]
    label: Structural (T1) image
    inputBinding:
      prefix: -s
  mode:
    type: ['null', string]
    label: Calibration mode (voxel/longtr/satrecov)
    inputBinding:
      prefix: --mode
  tr:
    type: ['null', double]
    label: TR of calibration image (seconds)
    inputBinding:
      prefix: --tr
  te:
    type: ['null', double]
    label: TE of calibration image (ms)
    inputBinding:
      prefix: --te
  cgain:
    type: ['null', double]
    label: Calibration gain
    inputBinding:
      prefix: --cgain

outputs:
  calibrated_perfusion:
    type: File
    outputBinding:
      glob:
        - $(inputs.output).nii.gz
        - $(inputs.output).nii
  log:
    type: File
    outputBinding:
      glob: asl_calib.log
