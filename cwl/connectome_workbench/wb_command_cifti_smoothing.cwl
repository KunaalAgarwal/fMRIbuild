#!/usr/bin/env cwl-runner

# https://www.humanconnectome.org/software/workbench-command/-cifti-smoothing
# Smooth CIFTI data on surfaces and volumes

cwlVersion: v1.2
class: CommandLineTool
baseCommand: ['wb_command', '-cifti-smoothing']

hints:
  DockerRequirement:
    dockerPull: khanlab/connectome-workbench:latest

stdout: wb_cifti_smoothing.log
stderr: wb_cifti_smoothing.err.log

inputs:
  cifti_in:
    type: File
    label: Input CIFTI file
    inputBinding:
      position: 1
  surface_kernel:
    type: double
    label: Gaussian surface smoothing kernel size in mm (sigma unless -fwhm)
    inputBinding:
      position: 2
  volume_kernel:
    type: double
    label: Gaussian volume smoothing kernel size in mm (sigma unless -fwhm)
    inputBinding:
      position: 3
  direction:
    type:
      type: enum
      symbols: [ROW, COLUMN]
    label: Smoothing dimension (ROW or COLUMN)
    inputBinding:
      position: 4
  cifti_out:
    type: string
    label: Output smoothed CIFTI file
    inputBinding:
      position: 5

  fwhm:
    type: ['null', boolean]
    label: Interpret kernel sizes as FWHM instead of sigma
    inputBinding:
      prefix: -fwhm
      position: 6
  left_surface:
    type: ['null', File]
    label: Left cortical surface file
    inputBinding:
      prefix: -left-surface
      position: 7
  right_surface:
    type: ['null', File]
    label: Right cortical surface file
    inputBinding:
      prefix: -right-surface
      position: 8
  cerebellum_surface:
    type: ['null', File]
    label: Cerebellum surface file
    inputBinding:
      prefix: -cerebellum-surface
      position: 9
  fix_zeros_volume:
    type: ['null', boolean]
    label: Treat volume zeros as missing data
    inputBinding:
      prefix: -fix-zeros-volume
      position: 10
  fix_zeros_surface:
    type: ['null', boolean]
    label: Treat surface zeros as missing data
    inputBinding:
      prefix: -fix-zeros-surface
      position: 11
  merged_volume:
    type: ['null', boolean]
    label: Smooth across subcortical structure boundaries
    inputBinding:
      prefix: -merged-volume
      position: 12
  cifti_roi:
    type: ['null', File]
    label: CIFTI ROI to restrict smoothing
    inputBinding:
      prefix: -cifti-roi
      position: 13

outputs:
  smoothed_cifti:
    type: File
    outputBinding:
      glob: $(inputs.cifti_out)
  log:
    type: File
    outputBinding:
      glob: wb_cifti_smoothing.log
  err_log:
    type: File
    outputBinding:
      glob: wb_cifti_smoothing.err.log
