#!/usr/bin/env cwl-runner

# https://mrtrix.readthedocs.io/en/latest/reference/commands/tck2connectome.html
# Generate connectivity matrix from tractogram

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'tck2connectome'

hints:
  DockerRequirement:
    dockerPull: mrtrix3/mrtrix3:latest

stdout: tck2connectome.log
stderr: tck2connectome.log

inputs:
  input_tracks:
    type: File
    label: Input tractogram
    inputBinding:
      position: 1
  parcellation:
    type: File
    label: Parcellation image (atlas)
    inputBinding:
      position: 2
  output:
    type: string
    label: Output connectivity matrix filename
    inputBinding:
      position: 3

  # Optional parameters
  assignment_radial_search:
    type: ['null', double]
    label: Radial search distance for node assignment (mm)
    inputBinding:
      prefix: -assignment_radial_search
  scale_length:
    type: ['null', boolean]
    label: Scale by streamline length
    inputBinding:
      prefix: -scale_length
  scale_invlength:
    type: ['null', boolean]
    label: Scale by inverse streamline length
    inputBinding:
      prefix: -scale_invlength
  scale_invnodevol:
    type: ['null', boolean]
    label: Scale by inverse node volume
    inputBinding:
      prefix: -scale_invnodevol
  stat_edge:
    type: ['null', string]
    label: Edge statistic (sum/mean/min/max)
    inputBinding:
      prefix: -stat_edge
  symmetric:
    type: ['null', boolean]
    label: Make matrix symmetric
    inputBinding:
      prefix: -symmetric
  zero_diagonal:
    type: ['null', boolean]
    label: Zero the diagonal of the matrix
    inputBinding:
      prefix: -zero_diagonal

outputs:
  connectome:
    type: File
    outputBinding:
      glob: $(inputs.output)
  log:
    type: File
    outputBinding:
      glob: tck2connectome.log
