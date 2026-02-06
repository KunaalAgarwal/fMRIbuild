#!/usr/bin/env cwl-runner

# https://mrtrix.readthedocs.io/en/latest/reference/commands/tcksift.html
# SIFT: filter tractogram to improve biological plausibility

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'tcksift'

hints:
  DockerRequirement:
    dockerPull: mrtrix3/mrtrix3:latest

stdout: tcksift.log
stderr: tcksift.log

inputs:
  input_tracks:
    type: File
    label: Input tractogram
    inputBinding:
      position: 1
  fod:
    type: File
    label: FOD image for filtering
    inputBinding:
      position: 2
  output:
    type: string
    label: Output filtered tractogram
    inputBinding:
      position: 3

  # Optional parameters
  act:
    type: ['null', File]
    label: ACT tissue-segmented image
    inputBinding:
      prefix: -act
  term_number:
    type: ['null', int]
    label: Target number of streamlines
    inputBinding:
      prefix: -term_number
  term_ratio:
    type: ['null', double]
    label: Target ratio of streamlines to keep
    inputBinding:
      prefix: -term_ratio

outputs:
  filtered_tractogram:
    type: File
    outputBinding:
      glob: $(inputs.output)
  log:
    type: File
    outputBinding:
      glob: tcksift.log
