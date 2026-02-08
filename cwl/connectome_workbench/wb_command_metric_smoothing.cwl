#!/usr/bin/env cwl-runner

# https://www.humanconnectome.org/software/workbench-command/-metric-smoothing
# Smooth surface metric data using geodesic Gaussian smoothing

cwlVersion: v1.2
class: CommandLineTool
baseCommand: ['wb_command', '-metric-smoothing']

hints:
  DockerRequirement:
    dockerPull: khanlab/connectome-workbench:latest

stdout: wb_metric_smoothing.log
stderr: wb_metric_smoothing.err.log

inputs:
  surface:
    type: File
    label: Surface file to smooth on (.surf.gii)
    inputBinding:
      position: 1
  metric_in:
    type: File
    label: Input metric file to smooth
    inputBinding:
      position: 2
  smoothing_kernel:
    type: double
    label: Gaussian smoothing kernel size in mm (sigma unless -fwhm)
    inputBinding:
      position: 3
  metric_out:
    type: string
    label: Output smoothed metric file
    inputBinding:
      position: 4

  fwhm:
    type: ['null', boolean]
    label: Interpret kernel size as FWHM instead of sigma
    inputBinding:
      prefix: -fwhm
      position: 5
  roi:
    type: ['null', File]
    label: ROI metric to restrict smoothing
    inputBinding:
      prefix: -roi
      position: 6
  fix_zeros:
    type: ['null', boolean]
    label: Treat zero values as missing data
    inputBinding:
      prefix: -fix-zeros
      position: 7
  column:
    type: ['null', string]
    label: Process single column (number or name)
    inputBinding:
      prefix: -column
      position: 8
  corrected_areas:
    type: ['null', File]
    label: Vertex areas metric for group average surfaces
    inputBinding:
      prefix: -corrected-areas
      position: 9
  method:
    type:
      - 'null'
      - type: enum
        symbols: [GEO_GAUSS_AREA, GEO_GAUSS_EQUAL, GEO_GAUSS]
    label: Smoothing algorithm (default GEO_GAUSS_AREA)
    inputBinding:
      prefix: -method
      position: 10

outputs:
  smoothed_metric:
    type: File
    outputBinding:
      glob: $(inputs.metric_out)
  log:
    type: File
    outputBinding:
      glob: wb_metric_smoothing.log
  err_log:
    type: File
    outputBinding:
      glob: wb_metric_smoothing.err.log
