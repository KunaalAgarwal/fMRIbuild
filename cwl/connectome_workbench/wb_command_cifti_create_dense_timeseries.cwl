#!/usr/bin/env cwl-runner

# https://www.humanconnectome.org/software/workbench-command/-cifti-create-dense-timeseries
# Create CIFTI dense timeseries from surface and volume data

cwlVersion: v1.2
class: CommandLineTool
baseCommand: ['wb_command', '-cifti-create-dense-timeseries']

hints:
  DockerRequirement:
    dockerPull: khanlab/connectome-workbench:latest

stdout: wb_cifti_create_dense_timeseries.log
stderr: wb_cifti_create_dense_timeseries.err.log

inputs:
  cifti_out:
    type: string
    label: Output CIFTI dense timeseries file (.dtseries.nii)
    inputBinding:
      position: 1

  volume_data:
    type: ['null', File]
    label: Volume file containing all voxel data for volume structures
    inputBinding:
      prefix: -volume
      position: 2
  structure_label_volume:
    type: ['null', File]
    label: Label volume identifying CIFTI structures
    inputBinding:
      position: 3

  left_metric:
    type: ['null', File]
    label: Metric file for left cortical surface
    inputBinding:
      prefix: -left-metric
      position: 4
  roi_left:
    type: ['null', File]
    label: ROI of vertices to use from left surface
    inputBinding:
      prefix: -roi-left
      position: 5

  right_metric:
    type: ['null', File]
    label: Metric file for right cortical surface
    inputBinding:
      prefix: -right-metric
      position: 6
  roi_right:
    type: ['null', File]
    label: ROI of vertices to use from right surface
    inputBinding:
      prefix: -roi-right
      position: 7

  cerebellum_metric:
    type: ['null', File]
    label: Metric file for cerebellum surface
    inputBinding:
      prefix: -cerebellum-metric
      position: 8

  timestep:
    type: ['null', double]
    label: Time step between frames in seconds (default 1.0)
    inputBinding:
      prefix: -timestep
      position: 9
  timestart:
    type: ['null', double]
    label: Starting time in seconds (default 0.0)
    inputBinding:
      prefix: -timestart
      position: 10
  unit:
    type:
      - 'null'
      - type: enum
        symbols: [SECOND, HERTZ, METER, RADIAN]
    label: Unit of timestep (default SECOND)
    inputBinding:
      prefix: -unit
      position: 11

outputs:
  cifti_output:
    type: File
    outputBinding:
      glob: $(inputs.cifti_out)
  log:
    type: File
    outputBinding:
      glob: wb_cifti_create_dense_timeseries.log
  err_log:
    type: File
    outputBinding:
      glob: wb_cifti_create_dense_timeseries.err.log
