#!/usr/bin/env cwl-runner

# https://github.com/daducci/AMICO
# AMICO NODDI (Neurite Orientation Dispersion and Density Imaging) fitting
# Uses convex optimization for fast and robust estimation of NODDI parameters

cwlVersion: v1.2
class: CommandLineTool
baseCommand: ['python3', '-c']

hints:
  DockerRequirement:
    dockerPull: cookpa/amico-noddi:latest

requirements:
  InitialWorkDirRequirement:
    listing:
      - entry: $(inputs.dwi)
        entryname: dwi.nii.gz
      - entry: $(inputs.bvals)
        entryname: bvals
      - entry: $(inputs.bvecs)
        entryname: bvecs
      - entry: $(inputs.mask)
        entryname: mask.nii.gz
  InlineJavascriptRequirement: {}

stdout: amico_noddi.log
stderr: amico_noddi.err.log

arguments:
  - position: 1
    valueFrom: |
      import amico
      import os
      amico.core.setup()
      ae = amico.Evaluation('.', '.')
      ae.load_data('dwi.nii.gz', 'bvals', 'bvecs', mask_filename='mask.nii.gz')
      ae.set_model('NODDI')
      ae.generate_kernels()
      ae.load_kernels()
      ae.fit()
      ae.save_results()

inputs:
  dwi:
    type: File
    label: Multi-shell diffusion MRI 4D image
  bvals:
    type: File
    label: b-values file
  bvecs:
    type: File
    label: b-vectors file
  mask:
    type: File
    label: Brain mask image

outputs:
  ndi_map:
    type: File
    outputBinding:
      glob:
        - AMICO/NODDI/FIT_ICVF.nii.gz
        - FIT_ICVF.nii.gz
    label: Neurite Density Index (NDI/ICVF) map
  odi_map:
    type: File
    outputBinding:
      glob:
        - AMICO/NODDI/FIT_OD.nii.gz
        - FIT_OD.nii.gz
    label: Orientation Dispersion Index (ODI) map
  fiso_map:
    type: File
    outputBinding:
      glob:
        - AMICO/NODDI/FIT_ISOVF.nii.gz
        - FIT_ISOVF.nii.gz
    label: Isotropic Volume Fraction (fISO) map
  log:
    type: File
    outputBinding:
      glob: amico_noddi.log
  err_log:
    type: File
    outputBinding:
      glob: amico_noddi.err.log
