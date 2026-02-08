#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/BIANCA
# Brain Intensity AbNormality Classification Algorithm

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'bianca'

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:latest

stdout: bianca.log
stderr: bianca.err.log

inputs:
  singlefile:
    type: File
    label: Master file listing subjects, images, masks, and transformations
    inputBinding:
      prefix: --singlefile=
      separate: false
  querysubjectnum:
    type: int
    label: Row number in master file for the subject to segment
    inputBinding:
      prefix: --querysubjectnum=
      separate: false
  brainmaskfeaturenum:
    type: int
    label: Column number in master file containing brain mask
    inputBinding:
      prefix: --brainmaskfeaturenum=
      separate: false
  labelfeaturenum:
    type: int
    label: Column number in master file containing manual lesion mask
    inputBinding:
      prefix: --labelfeaturenum=
      separate: false
  trainingnums:
    type: string
    label: Training subject row numbers (comma-separated) or "all"
    inputBinding:
      prefix: --trainingnums=
      separate: false

  output_name:
    type: string
    label: Output file basename
    default: bianca_output
    inputBinding:
      prefix: -o
  featuresubset:
    type: ['null', string]
    label: Comma-separated column numbers for intensity features
    inputBinding:
      prefix: --featuresubset=
      separate: false
  matfeaturenum:
    type: ['null', int]
    label: Column number containing MNI transformation matrices
    inputBinding:
      prefix: --matfeaturenum=
      separate: false
  spatialweight:
    type: ['null', double]
    label: Weighting for MNI spatial coordinates (default 1)
    inputBinding:
      prefix: --spatialweight=
      separate: false
  patchsizes:
    type: ['null', string]
    label: Patch sizes in voxels (comma-separated)
    inputBinding:
      prefix: --patchsizes=
      separate: false
  patch3D:
    type: ['null', boolean]
    label: Enable 3D patch processing
    inputBinding:
      prefix: --patch3D
  selectpts:
    type:
      - 'null'
      - type: enum
        symbols: [any, noborder, surround]
    label: Non-lesion point selection strategy
    inputBinding:
      prefix: --selectpts=
      separate: false
  trainingpts:
    type: ['null', string]
    label: Max lesion training points per subject (number or "equalpoints")
    inputBinding:
      prefix: --trainingpts=
      separate: false
  nonlespts:
    type: ['null', int]
    label: Max non-lesion points per subject
    inputBinding:
      prefix: --nonlespts=
      separate: false
  saveclassifierdata:
    type: ['null', string]
    label: Save training data to specified file
    inputBinding:
      prefix: --saveclassifierdata=
      separate: false
  loadclassifierdata:
    type: ['null', string]
    label: Load pre-saved classifier data from file
    inputBinding:
      prefix: --loadclassifierdata=
      separate: false
  verbose:
    type: ['null', boolean]
    label: Verbose output
    inputBinding:
      prefix: -v

outputs:
  wmh_map:
    type: File
    outputBinding:
      glob:
        - $(inputs.output_name).nii.gz
        - $(inputs.output_name)
  log:
    type: File
    outputBinding:
      glob: bianca.log
  err_log:
    type: File
    outputBinding:
      glob: bianca.err.log
