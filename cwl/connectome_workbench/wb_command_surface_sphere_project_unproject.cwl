#!/usr/bin/env cwl-runner

# https://www.humanconnectome.org/software/workbench-command/-surface-sphere-project-unproject
# Apply spherical registration by projecting through registered spheres

cwlVersion: v1.2
class: CommandLineTool
baseCommand: ['wb_command', '-surface-sphere-project-unproject']

hints:
  DockerRequirement:
    dockerPull: khanlab/connectome-workbench:latest

stdout: wb_surface_sphere_project_unproject.log
stderr: wb_surface_sphere_project_unproject.err.log

inputs:
  sphere_in:
    type: File
    label: Input sphere with desired output mesh
    inputBinding:
      position: 1
  sphere_project_to:
    type: File
    label: Sphere that aligns with sphere-in
    inputBinding:
      position: 2
  sphere_unproject_from:
    type: File
    label: sphere-project-to deformed to the desired output space
    inputBinding:
      position: 3
  sphere_out:
    type: string
    label: Output sphere filename
    inputBinding:
      position: 4

outputs:
  output_sphere:
    type: File
    outputBinding:
      glob: $(inputs.sphere_out)
  log:
    type: File
    outputBinding:
      glob: wb_surface_sphere_project_unproject.log
  err_log:
    type: File
    outputBinding:
      glob: wb_surface_sphere_project_unproject.err.log
