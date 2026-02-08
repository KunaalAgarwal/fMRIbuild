#!/usr/bin/env cwl-runner

# https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/TBSS/UserGuide
# TBSS step 1: preprocessing FA images
#
# tbss_1_preproc is a shell script that expects input FA images as simple
# filenames (not full paths). It uses the filename as the basis for output
# names under FA/. We use a wrapper script to copy staged inputs to the
# cwd before running tbss_1_preproc.

cwlVersion: v1.2
class: CommandLineTool
baseCommand: bash

hints:
  DockerRequirement:
    dockerPull: brainlife/fsl:latest

requirements:
  InitialWorkDirRequirement:
    listing:
      - entryname: run_tbss_preproc.sh
        entry: |
          #!/bin/bash
          set -e
          # Copy input FA images to cwd so tbss_1_preproc sees simple filenames
          for f in "$@"; do
            cp "$f" .
          done
          tbss_1_preproc *.nii.gz

arguments:
  - valueFrom: run_tbss_preproc.sh
    position: 0

stdout: tbss_1_preproc.log
stderr: tbss_1_preproc.log

inputs:
  fa_images:
    type: File[]
    label: Input FA images
    inputBinding:
      position: 1

outputs:
  FA_directory:
    type: Directory
    outputBinding:
      glob: FA
  log:
    type: File
    outputBinding:
      glob: tbss_1_preproc.log
