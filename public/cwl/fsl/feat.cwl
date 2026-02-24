#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FEAT
# Complete fMRI analysis pipeline: preprocessing, statistics, and post-stats
# The .fsf design file encodes all analysis parameters.
# input_data must be provided separately so cwltool can stage it
# inside the container; the .fsf paths are rewritten at runtime.

cwlVersion: v1.2
class: CommandLineTool

requirements:
  InlineJavascriptRequirement: {}
  InitialWorkDirRequirement:
    listing:
      - entry: $(inputs.design_file)
        entryname: design.fsf
        writable: true
      - entry: $(inputs.input_data)
      - entryname: run_feat.sh
        entry: |
          #!/bin/bash
          set -e
          export USER=\${USER:-cwluser}
          WD=`pwd`
          sed -i "s|^set feat_files(1).*|set feat_files(1) \"\${WD}/$(inputs.input_data.basename)\"|" design.fsf
          sed -i "s|^set fmri(outputdir).*|set fmri(outputdir) \"\${WD}/feat_output\"|" design.fsf
          feat design.fsf

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:latest

stdout: feat.log
stderr: feat.log

inputs:
  design_file:
    type: File
    label: FEAT design file (.fsf) containing all analysis parameters
  input_data:
    type: File
    label: 4D BOLD input data referenced by the design file

baseCommand: [bash, run_feat.sh]

outputs:
  feat_directory:
    type: Directory
    outputBinding:
      glob: "*.feat"
  log:
    type: File
    outputBinding:
      glob: feat.log
