#!/usr/bin/env cwl-runner

# https://mriqc.readthedocs.io/en/stable/
# MRIQC: MRI quality control pipeline

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'mriqc'

hints:
  DockerRequirement:
    dockerPull: nipreps/mriqc:latest

stdout: mriqc.log
stderr: mriqc.log

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
    label: Analysis level (participant/group)
    inputBinding:
      position: 3

  # Optional parameters
  participant_label:
    type: ['null', string]
    label: Participant label (without sub- prefix)
    inputBinding:
      prefix: --participant-label
  modalities:
    type: ['null', string]
    label: Modalities to process (T1w/T2w/bold)
    inputBinding:
      prefix: --modalities
  no_sub:
    type: ['null', boolean]
    label: Disable submission of quality metrics
    inputBinding:
      prefix: --no-sub
  nprocs:
    type: ['null', int]
    label: Number of processors
    inputBinding:
      prefix: --nprocs
  mem_gb:
    type: ['null', int]
    label: Memory limit (GB)
    inputBinding:
      prefix: --mem-gb

outputs:
  output_directory:
    type: Directory
    outputBinding:
      glob: $(inputs.output_dir)
  log:
    type: File
    outputBinding:
      glob: mriqc.log
