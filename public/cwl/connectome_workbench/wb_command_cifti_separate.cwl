#!/usr/bin/env cwl-runner

# https://www.humanconnectome.org/software/workbench-command/-cifti-separate
# Separate CIFTI file into surface and volume components

cwlVersion: v1.2
class: CommandLineTool
baseCommand: ['wb_command', '-cifti-separate']

hints:
  DockerRequirement:
    dockerPull: khanlab/connectome-workbench:latest

requirements:
  ShellCommandRequirement: {}
  InlineJavascriptRequirement: {}

stdout: wb_cifti_separate.log
stderr: wb_cifti_separate.err.log

inputs:
  cifti_in:
    type: File
    label: Input CIFTI file to separate
    inputBinding:
      position: 1
  direction:
    type:
      type: enum
      symbols: [ROW, COLUMN]
    label: Separation direction (ROW or COLUMN)
    inputBinding:
      position: 2

  volume_all:
    type: ['null', string]
    label: Output volume file for all volume structures
    inputBinding:
      prefix: -volume-all
      position: 3
  volume_all_crop:
    type: ['null', boolean]
    label: Crop volume to data size
    inputBinding:
      prefix: -crop
      position: 4

  metric_left:
    type: ['null', string]
    label: Output metric file for left cortex
    inputBinding:
      position: 5
      valueFrom: |
        ${
          if (self) return "-metric CORTEX_LEFT " + self;
          return "";
        }
      shellQuote: false
  metric_right:
    type: ['null', string]
    label: Output metric file for right cortex
    inputBinding:
      position: 6
      valueFrom: |
        ${
          if (self) return "-metric CORTEX_RIGHT " + self;
          return "";
        }
      shellQuote: false

outputs:
  volume_output:
    type: ['null', File]
    outputBinding:
      glob: $(inputs.volume_all)
  left_metric_output:
    type: ['null', File]
    outputBinding:
      glob: $(inputs.metric_left)
  right_metric_output:
    type: ['null', File]
    outputBinding:
      glob: $(inputs.metric_right)
  log:
    type: File
    outputBinding:
      glob: wb_cifti_separate.log
  err_log:
    type: File
    outputBinding:
      glob: wb_cifti_separate.err.log
