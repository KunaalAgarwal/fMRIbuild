#!/usr/bin/env cwl-runner

# https://surfer.nmr.mgh.harvard.edu/fswiki/PetSurfer
# PET partial volume correction using geometric transfer matrix

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'mri_gtmpvc'

hints:
  DockerRequirement:
    dockerPull: freesurfer/freesurfer:7.4.1

stdout: mri_gtmpvc.log
stderr: mri_gtmpvc.log

inputs:
  input:
    type: File
    label: Input PET image
    inputBinding:
      prefix: --i
      position: 1
  psf:
    type: double
    label: Point spread function FWHM (mm)
    inputBinding:
      prefix: --psf
      position: 2
  seg:
    type: File
    label: Segmentation file
    inputBinding:
      prefix: --seg
      position: 3
  output_dir:
    type: string
    label: Output directory
    inputBinding:
      prefix: --o
      position: 4

  # Optional parameters
  auto_mask:
    type: ['null', double]
    label: Auto-mask threshold
    inputBinding:
      prefix: --auto-mask
  reg:
    type: ['null', File]
    label: Registration file (LTA or reg.dat)
    inputBinding:
      prefix: --reg
  regheader:
    type: ['null', boolean]
    label: Assume registration is identity (header registration)
    inputBinding:
      prefix: --regheader
  no_rescale:
    type: ['null', boolean]
    label: Do not global rescale
    inputBinding:
      prefix: --no-rescale
  no_reduce_fov:
    type: ['null', boolean]
    label: Do not reduce FOV
    inputBinding:
      prefix: --no-reduce-fov

outputs:
  output_directory:
    type: Directory
    outputBinding:
      glob: $(inputs.output_dir)
  gtm_stats:
    type: ['null', File]
    outputBinding:
      glob: $(inputs.output_dir)/gtm.stats.dat
  log:
    type: File
    outputBinding:
      glob: mri_gtmpvc.log
