#!/usr/bin/env cwl-runner

# https://surfer.nmr.mgh.harvard.edu/fswiki/recon-all
# FreeSurfer complete cortical reconstruction pipeline

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'recon-all'
successCodes: [0, 137]

hints:
  DockerRequirement:
    dockerPull: freesurfer/freesurfer:7.4.1
  ResourceRequirement:
    ramMin: 8000
    coresMin: 1

requirements:
  EnvVarRequirement:
    envDef:
      SUBJECTS_DIR: $(runtime.outdir)
      FS_LICENSE: $(inputs.fs_license.path)
  InitialWorkDirRequirement:
    listing:
      - entry: $(inputs.subjects_dir)
        writable: true
  InlineJavascriptRequirement: {}

stdout: recon-all.log
stderr: recon-all.err.log

inputs:
  subjects_dir:
    type: Directory
    label: FreeSurfer subjects directory
  fs_license:
    type: File
    label: FreeSurfer license file

  subject_id:
    type: string
    label: Subject identifier
    inputBinding:
      prefix: -s
  input_t1:
    type: File
    label: Input T1-weighted image
    inputBinding:
      prefix: -i

  # Pipeline stage flags
  run_all:
    type: ['null', boolean]
    label: Run full pipeline (autorecon1 + autorecon2 + autorecon3)
    inputBinding:
      prefix: -all
  autorecon1:
    type: ['null', boolean]
    label: Run autorecon1 (motion correction, skull stripping, Talairach)
    inputBinding:
      prefix: -autorecon1
  autorecon2:
    type: ['null', boolean]
    label: Run autorecon2 (segmentation, surface generation, topology fix)
    inputBinding:
      prefix: -autorecon2
  autorecon3:
    type: ['null', boolean]
    label: Run autorecon3 (parcellation, statistics, cortical thickness)
    inputBinding:
      prefix: -autorecon3

  # Optional inputs for pial surface refinement
  t2_image:
    type: ['null', File]
    label: T2-weighted image for pial surface refinement
    inputBinding:
      prefix: -T2
  flair_image:
    type: ['null', File]
    label: FLAIR image for pial surface refinement
    inputBinding:
      prefix: -FLAIR
  t2pial:
    type: ['null', boolean]
    label: Use T2 image for pial surface placement
    inputBinding:
      prefix: -T2pial
  flair_pial:
    type: ['null', boolean]
    label: Use FLAIR image for pial surface placement
    inputBinding:
      prefix: -FLAIRpial

  # Performance options
  openmp:
    type: ['null', int]
    label: Number of OpenMP threads
    inputBinding:
      prefix: -openmp
  parallel:
    type: ['null', boolean]
    label: Enable parallel processing where possible
    inputBinding:
      prefix: -parallel

outputs:
  subjects_output_dir:
    type: Directory
    outputBinding:
      glob: $(inputs.subject_id)
  log:
    type: File
    outputBinding:
      glob: recon-all.log
  err_log:
    type: File
    outputBinding:
      glob: recon-all.err.log
