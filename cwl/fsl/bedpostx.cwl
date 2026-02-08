#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FDT/UserGuide#BEDPOSTX
# Bayesian estimation of diffusion parameters (fiber orientations)

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'bedpostx'

requirements:
  InlineJavascriptRequirement: {}
  InitialWorkDirRequirement:
    listing:
      - entry: $(inputs.data_dir)
        writable: true

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:6.0.4-patched2
  ResourceRequirement:
    ramMin: 4096
    coresMin: 1

stdout: bedpostx.log
stderr: bedpostx_stderr.log

inputs:
  data_dir:
    type: Directory
    label: Input data directory (must contain data, bvals, bvecs, nodif_brain_mask)
    inputBinding:
      position: 1
      valueFrom: $(self.basename)

  # Optional parameters
  nfibres:
    type: ['null', int]
    label: Number of fibres per voxel (default 3)
    inputBinding:
      prefix: -n
      position: 2
  model:
    type: ['null', int]
    label: Deconvolution model (1=monoexp, 2=multiexp, 3=zeppelin)
    inputBinding:
      prefix: -model
      position: 3
  rician:
    type: ['null', boolean]
    label: Use Rician noise modelling
    inputBinding:
      prefix: --rician
      position: 4

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
