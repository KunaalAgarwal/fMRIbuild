#!/usr/bin/env cwl-runner

# https://github.com/cookpa/amico-noddi
# AMICO NODDI (Neurite Orientation Dispersion and Density Imaging) fitting
# Uses convex optimization for fast and robust estimation of NODDI parameters

cwlVersion: v1.2
class: CommandLineTool

hints:
  DockerRequirement:
    dockerPull: cookpa/amico-noddi:0.1.2

requirements:
  InitialWorkDirRequirement:
    listing:
      - entry: $(inputs.dwi)
        entryname: dwi.nii.gz
      - entry: $(inputs.bvals)
        entryname: dwi.bval
      - entry: $(inputs.bvecs)
        entryname: dwi.bvec
      - entry: $(inputs.mask)
        entryname: mask.nii.gz
  InlineJavascriptRequirement: {}

stdout: amico_noddi.log
stderr: amico_noddi.err.log

arguments:
  - prefix: --dwi-root
    valueFrom: dwi
  - prefix: --brain-mask
    valueFrom: mask.nii.gz
  - prefix: --output-root
    valueFrom: output/NODDI
  - prefix: --work-dir
    valueFrom: /tmp/amico_work

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
  num_threads:
    type: ['null', int]
    label: Maximum number of CPU threads (default 1)
    inputBinding:
      prefix: --num-threads
  b0_threshold:
    type: ['null', int]
    label: Threshold for considering measurements b=0 (default 10)
    inputBinding:
      prefix: --b0-threshold
  csf_diffusivity:
    type: ['null', double]
    label: CSF diffusivity in mm^2/s (default 0.003)
    inputBinding:
      prefix: --csf-diffusivity
  parallel_diffusivity:
    type: ['null', double]
    label: Intracellular diffusivity parallel to neurites in mm^2/s (default 0.0017)
    inputBinding:
      prefix: --parallel-diffusivity
  ex_vivo:
    type: ['null', boolean]
    label: Use ex-vivo AMICO model
    inputBinding:
      prefix: --ex-vivo
      valueFrom: '$(self ? "1" : "0")'

outputs:
  ndi_map:
    type: File
    outputBinding:
      glob:
        - output/NODDI*ICVF.nii.gz
    label: Neurite Density Index (NDI/ICVF) map
  odi_map:
    type: File
    outputBinding:
      glob:
        - output/NODDI*OD.nii.gz
    label: Orientation Dispersion Index (ODI) map
  fiso_map:
    type: File
    outputBinding:
      glob:
        - output/NODDI*ISOVF.nii.gz
    label: Isotropic Volume Fraction (fISO) map
  log:
    type: File
    outputBinding:
      glob: amico_noddi.log
  err_log:
    type: File
    outputBinding:
      glob: amico_noddi.err.log
