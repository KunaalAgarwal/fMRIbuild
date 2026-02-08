#!/usr/bin/env cwl-runner

# https://surfer.nmr.mgh.harvard.edu/fswiki/PetSurfer
# PET partial volume correction using geometric transfer matrix

cwlVersion: v1.2
class: CommandLineTool
baseCommand: 'mri_gtmpvc'

hints:
  DockerRequirement:
    dockerPull: freesurfer/freesurfer:7.4.1

requirements:
  EnvVarRequirement:
    envDef:
      - envName: SUBJECTS_DIR
        envValue: $(inputs.subjects_dir.path)
      - envName: FS_LICENSE
        envValue: $(inputs.fs_license.path)

stdout: mri_gtmpvc.log
stderr: mri_gtmpvc.err.log

inputs:
  subjects_dir:
    type: Directory
    label: FreeSurfer SUBJECTS_DIR
  fs_license:
    type: File
    label: FreeSurfer license file

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
    secondaryFiles:
      - pattern: "^.ctab"
        required: false
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
  auto_mask_fwhm:
    type: ['null', double]
    label: Auto-mask smoothing FWHM (mm)
    inputBinding:
      prefix: --auto-mask
      position: 10
  auto_mask_thresh:
    type: ['null', double]
    label: Auto-mask threshold (use with auto_mask_fwhm)
    inputBinding:
      position: 11
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
  default_seg_merge:
    type: ['null', boolean]
    label: Use default scheme to merge hemispheres and set tissue types
    inputBinding:
      prefix: --default-seg-merge
  ctab_default:
    type: ['null', boolean]
    label: Use default FreeSurfer color table with tissue types
    inputBinding:
      prefix: --ctab-default
  vg_thresh:
    type: ['null', double]
    label: Volume geometry threshold for registration check
    inputBinding:
      prefix: --vg-thresh

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
  err_log:
    type: File
    outputBinding:
      glob: mri_gtmpvc.err.log
