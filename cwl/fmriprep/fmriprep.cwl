#!/usr/bin/env cwl-runner

# https://fmriprep.org/en/stable/
# fMRIPrep: fMRI preprocessing pipeline

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'fmriprep'

hints:
  DockerRequirement:
    dockerPull: nipreps/fmriprep:latest

stdout: fmriprep.log
stderr: fmriprep.log

inputs:
  bids_dir:
    type: Directory
    label: BIDS dataset directory
    inputBinding:
      position: 1
  output_dir:
    type: string
    label: Output directory
    inputBinding:
      position: 2
  analysis_level:
    type: string
    label: Analysis level (participant)
    inputBinding:
      position: 3

  # Optional parameters
  participant_label:
    type: ['null', string]
    label: Participant label (without sub- prefix)
    inputBinding:
      prefix: --participant-label
  output_spaces:
    type: ['null', string]
    label: Output spaces (e.g., MNI152NLin2009cAsym)
    inputBinding:
      prefix: --output-spaces
  fs_license_file:
    type: ['null', File]
    label: FreeSurfer license file
    inputBinding:
      prefix: --fs-license-file
  nprocs:
    type: ['null', int]
    label: Number of processors
    inputBinding:
      prefix: --nprocs
  mem_mb:
    type: ['null', int]
    label: Memory limit (MB)
    inputBinding:
      prefix: --mem-mb
  skip_bids_validation:
    type: ['null', boolean]
    label: Skip BIDS validation
    inputBinding:
      prefix: --skip-bids-validation

outputs:
  output_directory:
    type: Directory
    outputBinding:
      glob: $(inputs.output_dir)
  log:
    type: File
    outputBinding:
      glob: fmriprep.log
