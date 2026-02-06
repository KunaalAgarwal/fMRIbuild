#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FDT/UserGuide#BEDPOSTX
# Bayesian estimation of diffusion parameters (fiber orientations)

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'bedpostx'

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:latest

stdout: bedpostx.log
stderr: bedpostx.log

inputs:
  data_dir:
    type: Directory
    label: Input data directory (must contain data, bvals, bvecs, nodif_brain_mask)
    inputBinding:
      position: 1

  # Optional parameters
  nfibres:
    type: ['null', int]
    label: Number of fibres per voxel (default 3)
    inputBinding:
      prefix: -n
  model:
    type: ['null', int]
    label: Deconvolution model (1=monoexp, 2=multiexp, 3=zeppelin)
    inputBinding:
      prefix: -model
  rician:
    type: ['null', boolean]
    label: Use Rician noise modelling
    inputBinding:
      prefix: --rician

outputs:
  output_directory:
    type: Directory
    outputBinding:
      glob: $(inputs.data_dir.basename).bedpostX
  merged_samples:
    type: File[]
    outputBinding:
      glob: $(inputs.data_dir.basename).bedpostX/merged_*samples.nii.gz
  log:
    type: File
    outputBinding:
      glob: bedpostx.log
