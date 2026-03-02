#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Fslutils
# Change the file type of an image

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'fslchfiletype'

requirements:
  InitialWorkDirRequirement:
    listing:
      - entry: $(inputs.input)
        writable: true

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:latest

stdout: fslchfiletype.log
stderr: fslchfiletype.log

inputs:
  filetype:
    type:
      type: enum
      symbols: [NIFTI_GZ, NIFTI, NIFTI_PAIR, NIFTI_PAIR_GZ, ANALYZE, ANALYZE_GZ]
    label: Output file type
    inputBinding:
      position: 1
  input:
    type: File
    label: Input image file
    inputBinding:
      position: 2
      valueFrom: $(self.basename)
  output:
    type: ['null', string]
    label: Output filename (default overwrites input)
    inputBinding:
      position: 3

outputs:
  converted_file:
    type: File[]
    outputBinding:
      glob:
        - "*.nii.gz"
        - "*.nii"
        - "*.hdr"
        - "*.img"
  log:
    type: File
    outputBinding:
      glob: fslchfiletype.log
