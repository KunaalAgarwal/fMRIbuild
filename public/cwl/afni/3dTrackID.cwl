#!/usr/bin/env cwl-runner

# https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dTrackID.html
# Deterministic and probabilistic tractography

cwlVersion: v1.2
class: CommandLineTool
baseCommand: '3dTrackID'

requirements:
  InitialWorkDirRequirement:
    listing: $(inputs.dti_files)

hints:
  DockerRequirement:
    dockerPull: brainlife/afni:latest

stdout: $(inputs.prefix).log
stderr: $(inputs.prefix).log

inputs:
  mode:
    type:
      type: enum
      symbols: [DET, MINIP, PROB]
    label: Tracking mode (DET=deterministic, MINIP=mini-probabilistic, PROB=probabilistic)
    inputBinding: {prefix: -mode, position: 1}
  dti_in:
    type: string
    label: DTI input prefix (basename, files staged via dti_files)
    inputBinding: {prefix: -dti_in, position: 2}
  dti_files:
    type: File[]
    label: DTI parameter files from 3dDWItoDT (HEAD/BRIK pairs, staged into working dir)
  netrois:
    type: File
    label: Network ROI file (integer-labeled mask)
    inputBinding: {prefix: -netrois, position: 3}
  prefix:
    type: string
    label: Output prefix
    inputBinding: {prefix: -prefix, position: 4}

  # Optional parameters
  mask:
    type: ['null', File]
    label: Brain mask (WM mask recommended)
    inputBinding: {prefix: -mask}
  logic:
    type:
      - 'null'
      - type: enum
        symbols: [OR, AND]
    label: Logic for multi-ROI tracking (default OR)
    inputBinding: {prefix: -logic}
  algopt:
    type: ['null', File]
    label: Algorithm options file
    inputBinding: {prefix: -algopt}
  unc_min_FA:
    type: ['null', double]
    label: Minimum FA for uncertainty calc
    inputBinding: {prefix: -unc_min_FA}
  unc_min_V:
    type: ['null', double]
    label: Minimum confidence for uncertainty
    inputBinding: {prefix: -unc_min_V}
  alg_Thresh_FA:
    type: ['null', double]
    label: FA threshold for tracking
    inputBinding: {prefix: -alg_Thresh_FA}
  alg_Thresh_ANG:
    type: ['null', double]
    label: Angle threshold (degrees) for tracking
    inputBinding: {prefix: -alg_Thresh_ANG}
  alg_Thresh_Len:
    type: ['null', double]
    label: Minimum tract length (mm)
    inputBinding: {prefix: -alg_Thresh_Len}
  alg_Nseed_X:
    type: ['null', int]
    label: Number of seeds per voxel (X direction)
    inputBinding: {prefix: -alg_Nseed_X}
  alg_Nseed_Y:
    type: ['null', int]
    label: Number of seeds per voxel (Y direction)
    inputBinding: {prefix: -alg_Nseed_Y}
  alg_Nseed_Z:
    type: ['null', int]
    label: Number of seeds per voxel (Z direction)
    inputBinding: {prefix: -alg_Nseed_Z}
  nifti:
    type: ['null', boolean]
    label: Output in NIfTI format
    inputBinding: {prefix: -nifti}
  no_indipair_out:
    type: ['null', boolean]
    label: Do not output individual pairwise maps
    inputBinding: {prefix: -no_indipair_out}
  write_rois:
    type: ['null', boolean]
    label: Write out ROI volumes
    inputBinding: {prefix: -write_rois}
  write_opts:
    type: ['null', boolean]
    label: Write out tracking options
    inputBinding: {prefix: -write_opts}
  pair_out_power:
    type: ['null', boolean]
    label: Output power-averaged map
    inputBinding: {prefix: -pair_out_power}

outputs:
  tracts:
    type: File
    outputBinding:
      glob:
        - $(inputs.prefix)*.trk
        - $(inputs.prefix)*.niml.tract
  connectivity_matrix:
    type: ['null', File]
    outputBinding:
      glob: $(inputs.prefix)*.grid
  stats:
    type: ['null', File]
    outputBinding:
      glob: $(inputs.prefix)*.stats
  log:
    type: File
    outputBinding:
      glob: $(inputs.prefix).log
