# Comprehensive fMRI Analysis Tools Reference

This document catalogs neuroimaging analysis tools commonly used in fMRI research, organized by software library. Each entry includes a description and CWL (Common Workflow Language) implementation feasibility.

## CWL Compatibility Legend

| Status | Meaning |
|--------|---------|
| ✅ Ready | Command-line tool, straightforward CWL implementation |
| ⚠️ Possible | Requires wrapper script or special configuration |
| ❌ Not Feasible | GUI-only, interactive, or architecture incompatible |

---

## FSL (FMRIB Software Library)

FSL is a comprehensive library of analysis tools for FMRI, MRI, and DTI brain imaging data. All FSL tools are command-line based, making them excellent candidates for CWL implementation.

### Preprocessing Tools

#### BET (Brain Extraction Tool)
- **Command**: `bet`
- **Function**: Removes non-brain tissue from structural and functional images using a surface model approach
- **Key Parameters**: Fractional intensity threshold (-f), vertical gradient (-g), output brain mask (-m)
- **Typical Use**: First step in most preprocessing pipelines to isolate brain tissue
- **CWL Status**: ✅ Ready
- **Notes**: Simple input/output structure; commonly the first node in workflows

#### FAST (FMRIB's Automated Segmentation Tool)
- **Command**: `fast`
- **Function**: Segments brain images into gray matter, white matter, and CSF with bias field correction
- **Key Parameters**: Number of tissue classes (-n), output type (-o), bias field correction (-B)
- **Typical Use**: Tissue probability maps for normalization, VBM studies, or masking
- **CWL Status**: ✅ Ready
- **Notes**: Produces multiple output files; CWL should capture all tissue probability maps

#### MCFLIRT (Motion Correction FLIRT)
- **Command**: `mcflirt`
- **Function**: Intra-modal motion correction for fMRI time series using rigid-body transformations
- **Key Parameters**: Reference volume (-refvol), cost function (-cost), motion parameter output (-plots)
- **Typical Use**: Correcting head motion in functional data; motion parameters used as nuisance regressors
- **CWL Status**: ✅ Ready
- **Notes**: Outputs transformation matrices and motion parameter files useful for QC

#### FLIRT (FMRIB's Linear Image Registration Tool)
- **Command**: `flirt`
- **Function**: Linear (affine) registration between images using 6, 9, or 12 degrees of freedom
- **Key Parameters**: Reference image (-ref), degrees of freedom (-dof), cost function (-cost), output matrix (-omat)
- **Typical Use**: EPI-to-structural alignment, structural-to-standard registration
- **CWL Status**: ✅ Ready
- **Notes**: Foundation for many registration workflows; transformation matrices enable chained registrations

#### FNIRT (FMRIB's Non-linear Image Registration Tool)
- **Command**: `fnirt`
- **Function**: Non-linear registration using spline-based deformations for precise anatomical alignment
- **Key Parameters**: Reference (-ref), affine input (--aff), configuration file (--config), warp output (--cout)
- **Typical Use**: High-accuracy normalization to MNI space for group analyses
- **CWL Status**: ✅ Ready
- **Notes**: Computationally intensive; benefits from configuration file inputs in CWL

#### FUGUE (FMRIB's Utility for Geometrically Unwarping EPIs)
- **Command**: `fugue`
- **Function**: Corrects geometric distortions in EPI images using fieldmap data
- **Key Parameters**: Input fieldmap (--loadfmap), dwell time (--dwell), unwarp direction (--unwarpdir)
- **Typical Use**: Distortion correction when fieldmap data is available
- **CWL Status**: ✅ Ready
- **Notes**: Requires preprocessed fieldmap; often used with fsl_prepare_fieldmap

#### TOPUP
- **Command**: `topup`
- **Function**: Estimates and corrects susceptibility-induced distortions using reversed phase-encode images
- **Key Parameters**: Image pairs (--imain), acquisition parameters (--datain), configuration (--config)
- **Typical Use**: Distortion correction using blip-up/blip-down acquisitions
- **CWL Status**: ✅ Ready
- **Notes**: Requires specific acquisition protocol; outputs warp fields and corrected images

#### SUSAN (Smallest Univalue Segment Assimilating Nucleus)
- **Command**: `susan`
- **Function**: Edge-preserving noise reduction that smooths within tissue boundaries
- **Key Parameters**: Brightness threshold, spatial size, dimensionality
- **Typical Use**: Noise reduction while preserving structural boundaries
- **CWL Status**: ✅ Ready
- **Notes**: Alternative to Gaussian smoothing when edge preservation is important

#### SliceTimer
- **Command**: `slicetimer`
- **Function**: Corrects for differences in slice acquisition times within a volume
- **Key Parameters**: TR (-r), slice order (--odd/--down), timing file (--tcustom)
- **Typical Use**: Temporal alignment of slices acquired at different times
- **CWL Status**: ✅ Ready
- **Notes**: Important for event-related designs; must match actual acquisition order

#### fslreorient2std
- **Command**: `fslreorient2std`
- **Function**: Reorients images to match standard (MNI) orientation
- **Key Parameters**: Input image, output image
- **Typical Use**: Ensuring consistent orientation before processing
- **CWL Status**: ✅ Ready
- **Notes**: Simple transformation; good first step for standardizing inputs

#### fslsplit
- **Command**: `fslsplit`
- **Function**: Splits 4D time series into individual 3D volumes
- **Key Parameters**: Input 4D image, output basename, split direction (-t/-x/-y/-z)
- **Typical Use**: Processing individual volumes separately, quality control
- **CWL Status**: ✅ Ready
- **Notes**: Output is multiple files; CWL should handle as array

#### fslmerge
- **Command**: `fslmerge`
- **Function**: Concatenates multiple 3D volumes into a 4D time series
- **Key Parameters**: Merge direction (-t/-x/-y/-z), output file, input files
- **Typical Use**: Combining processed volumes, concatenating runs
- **CWL Status**: ✅ Ready
- **Notes**: Accepts variable number of inputs; useful after parallel processing

### Statistical Analysis Tools

#### FEAT (FMRI Expert Analysis Tool)
- **Command**: `feat`
- **Function**: Complete first and higher-level fMRI analysis including preprocessing, GLM, and group statistics
- **Key Parameters**: Design file (.fsf) containing all analysis parameters
- **Typical Use**: Full analysis pipeline from raw data to statistical maps
- **CWL Status**: ⚠️ Possible
- **Notes**: Requires .fsf design file generation; complex but achievable with wrapper scripts

#### FILM (FMRIB's Improved Linear Model)
- **Command**: `film_gls`
- **Function**: Fits GLM to fMRI time series with autocorrelation correction
- **Key Parameters**: Input 4D data, design matrix, autocorrelation options
- **Typical Use**: First-level statistical analysis within FEAT or standalone
- **CWL Status**: ✅ Ready
- **Notes**: Core statistical engine; design matrix must be pre-generated

#### FLAME (FMRIB's Local Analysis of Mixed Effects)
- **Command**: `flameo`
- **Function**: Mixed-effects group analysis accounting for within and between-subject variance
- **Key Parameters**: Cope images, variance images, design matrix, contrast file
- **Typical Use**: Second-level group analyses with proper random effects
- **CWL Status**: ✅ Ready
- **Notes**: Requires first-level outputs; multiple run modes (OLS, FLAME1, FLAME2)

#### Randomise
- **Command**: `randomise`
- **Function**: Non-parametric permutation testing for statistical inference
- **Key Parameters**: Input 4D, design matrix, contrasts, number of permutations (-n), TFCE (-T)
- **Typical Use**: Group-level inference with family-wise error correction
- **CWL Status**: ✅ Ready
- **Notes**: Computationally intensive; permutation count affects runtime significantly

#### MELODIC
- **Command**: `melodic`
- **Function**: Independent Component Analysis for data exploration and denoising
- **Key Parameters**: Input data, dimensionality (-d), output directory
- **Typical Use**: Resting-state network identification, noise component detection
- **CWL Status**: ✅ Ready
- **Notes**: Can be single-subject or group; outputs multiple component maps

#### FIX (FMRIB's ICA-based Xnoiseifier)
- **Command**: `fix`
- **Function**: Automatically classifies and removes noise ICA components
- **Key Parameters**: MELODIC directory, training data, threshold
- **Typical Use**: Automated denoising of resting-state or task data
- **CWL Status**: ⚠️ Possible
- **Notes**: Requires trained classifier; MATLAB runtime dependency in some versions

#### dual_regression
- **Command**: `dual_regression`
- **Function**: Projects group ICA maps back to individual subjects
- **Key Parameters**: Group maps, design matrix, contrasts, permutations, subject list
- **Typical Use**: Group comparisons of resting-state networks
- **CWL Status**: ✅ Ready
- **Notes**: Script-based; performs spatial and temporal regression stages

### Diffusion and Structural Tools

#### BEDPOSTX
- **Command**: `bedpostx`
- **Function**: Bayesian estimation of diffusion parameters with crossing fiber modeling
- **Key Parameters**: Data directory (with data, bvals, bvecs, nodif_brain_mask)
- **Typical Use**: Preparing diffusion data for probabilistic tractography
- **CWL Status**: ⚠️ Possible
- **Notes**: Directory-based I/O; GPU version available for speed

#### PROBTRACKX2
- **Command**: `probtrackx2`
- **Function**: Probabilistic tractography using distributions from BEDPOSTX
- **Key Parameters**: Seed mask (-x), BEDPOSTX directory (-s), waypoint masks, exclusion masks
- **Typical Use**: White matter pathway reconstruction, connectivity analysis
- **CWL Status**: ✅ Ready
- **Notes**: Many optional parameters; flexible seed/target configurations

#### TBSS (Tract-Based Spatial Statistics)
- **Command**: `tbss_*` (multiple scripts)
- **Function**: Voxelwise analysis of FA and other diffusion metrics on skeleton
- **Key Parameters**: FA images, registration options
- **Typical Use**: Group comparisons of white matter integrity
- **CWL Status**: ⚠️ Possible
- **Notes**: Multi-step pipeline; each step can be individual CWL tool

#### FIRST
- **Command**: `run_first_all`
- **Function**: Segmentation of subcortical structures using shape and appearance models
- **Key Parameters**: Input T1 (-i), structure selection (-s)
- **Typical Use**: Automated segmentation of hippocampus, amygdala, basal ganglia, etc.
- **CWL Status**: ✅ Ready
- **Notes**: Outputs meshes and volumetric labels

#### SIENA/SIENAX
- **Command**: `siena` / `sienax`
- **Function**: Brain atrophy estimation (longitudinal) and cross-sectional volume estimation
- **Key Parameters**: Input images, BET options
- **Typical Use**: Longitudinal atrophy studies, brain volume normalization
- **CWL Status**: ✅ Ready
- **Notes**: SIENA requires two timepoints; SIENAX is single-timepoint

#### fsl_anat
- **Command**: `fsl_anat`
- **Function**: Complete structural MRI processing pipeline
- **Key Parameters**: Input T1 (-i), processing options
- **Typical Use**: Standardized structural preprocessing including bias correction, registration, segmentation
- **CWL Status**: ✅ Ready
- **Notes**: Comprehensive pipeline; outputs organized in directory structure

### Utility Tools

#### fslmaths
- **Command**: `fslmaths`
- **Function**: Versatile image calculator for mathematical operations, filtering, and thresholding
- **Key Parameters**: Input image, operations (chained), output image
- **Typical Use**: Masking, thresholding, smoothing, mathematical operations
- **CWL Status**: ✅ Ready
- **Notes**: Highly flexible; operation chain makes CWL definition require careful parameter design

#### fslstats
- **Command**: `fslstats`
- **Function**: Calculates statistics from image data
- **Key Parameters**: Input image, statistic flags (-m, -s, -V, -R, etc.)
- **Typical Use**: QC metrics, threshold determination, ROI statistics
- **CWL Status**: ✅ Ready
- **Notes**: Text output; useful for parameter extraction in workflows

#### fslroi
- **Command**: `fslroi`
- **Function**: Extracts region of interest or subvolume from image
- **Key Parameters**: Input, output, dimension ranges (xmin xsize ymin ysize...)
- **Typical Use**: Cropping images, extracting specific volumes from time series
- **CWL Status**: ✅ Ready
- **Notes**: Simple positional arguments

#### fslmeants
- **Command**: `fslmeants`
- **Function**: Extracts mean time series from ROI or coordinate
- **Key Parameters**: Input 4D (-i), mask (-m) or coordinate (-c)
- **Typical Use**: ROI time course extraction for connectivity or plotting
- **CWL Status**: ✅ Ready
- **Notes**: Text output; foundation for ROI-based analyses

#### cluster
- **Command**: `cluster`
- **Function**: Identifies and reports clusters in statistical images
- **Key Parameters**: Input z-stat, threshold (-t), connectivity, output options
- **Typical Use**: Cluster-level inference, extracting peak coordinates
- **CWL Status**: ✅ Ready
- **Notes**: Multiple output types (table, images)

#### applywarp
- **Command**: `applywarp`
- **Function**: Applies linear and non-linear transformations to images
- **Key Parameters**: Input (-i), reference (-r), warp field (-w), premat (--premat)
- **Typical Use**: Applying normalization, transforming ROIs between spaces
- **CWL Status**: ✅ Ready
- **Notes**: Can chain multiple transformations

#### invwarp
- **Command**: `invwarp`
- **Function**: Inverts a non-linear warp field
- **Key Parameters**: Warp field (-w), reference (-r), output (-o)
- **Typical Use**: Transforming from standard to native space
- **CWL Status**: ✅ Ready
- **Notes**: Required for bringing atlases to native space

#### convertwarp
- **Command**: `convertwarp`
- **Function**: Combines multiple transformations into single warp field
- **Key Parameters**: Reference (-r), warps/affines to combine
- **Typical Use**: Efficient application of multiple registration steps
- **CWL Status**: ✅ Ready
- **Notes**: Reduces interpolation steps

---

## AFNI (Analysis of Functional NeuroImages)

AFNI provides a comprehensive suite of C-based programs for fMRI analysis. Most tools are command-line based with excellent CWL compatibility.

### Preprocessing Tools

#### 3dSkullStrip
- **Command**: `3dSkullStrip`
- **Function**: Removes non-brain tissue using an expansion algorithm
- **Key Parameters**: -input, -prefix, -push_to_edge, -orig_vol
- **Typical Use**: Brain extraction for functional or structural images
- **CWL Status**: ✅ Ready
- **Notes**: Alternative to BET; different algorithm may work better for some datasets

#### 3dvolreg
- **Command**: `3dvolreg`
- **Function**: Rigid-body motion correction by registering all volumes to a base
- **Key Parameters**: -base, -prefix, -1Dfile (motion parameters), -maxdisp
- **Typical Use**: Motion correction; outputs 6 motion parameters
- **CWL Status**: ✅ Ready
- **Notes**: Motion parameters in different format than FSL

#### 3dTshift
- **Command**: `3dTshift`
- **Function**: Corrects for slice timing differences via temporal interpolation
- **Key Parameters**: -tpattern (alt+z, seq+z, etc.), -prefix, -tzero
- **Typical Use**: Aligning all slices to same temporal reference
- **CWL Status**: ✅ Ready
- **Notes**: Pattern must match acquisition; check with 3dinfo

#### 3dDespike
- **Command**: `3dDespike`
- **Function**: Removes spike artifacts from time series using L1 fit
- **Key Parameters**: -prefix, -NEW (algorithm version), -nomask
- **Typical Use**: Artifact removal before other preprocessing
- **CWL Status**: ✅ Ready
- **Notes**: Good for reducing motion-related spikes

#### 3dBandpass
- **Command**: `3dBandpass`
- **Function**: Bandpass filtering of time series with optional regression
- **Key Parameters**: lowfreq, highfreq, -prefix, -ort (confound removal)
- **Typical Use**: Resting-state frequency filtering (typically 0.01-0.1 Hz)
- **CWL Status**: ✅ Ready
- **Notes**: Can simultaneously regress nuisance variables

#### 3dBlurToFWHM
- **Command**: `3dBlurToFWHM`
- **Function**: Spatially smooths data to achieve target smoothness level
- **Key Parameters**: -FWHM, -input, -prefix, -mask
- **Typical Use**: Achieving consistent smoothness across subjects/studies
- **CWL Status**: ✅ Ready
- **Notes**: Adaptive smoothing; measures actual smoothness achieved

#### 3dmerge
- **Command**: `3dmerge`
- **Function**: Spatial filtering and dataset merging operations
- **Key Parameters**: -1blur_fwhm, -doall, -prefix
- **Typical Use**: Gaussian smoothing of functional data
- **CWL Status**: ✅ Ready
- **Notes**: Simpler smoothing than 3dBlurToFWHM

#### 3dAllineate
- **Command**: `3dAllineate`
- **Function**: Linear registration with multiple cost functions
- **Key Parameters**: -base, -source, -prefix, -cost, -1Dmatrix_save
- **Typical Use**: Affine alignment between modalities or to standard space
- **CWL Status**: ✅ Ready
- **Notes**: Flexible cost functions for different registration scenarios

#### 3dQwarp
- **Command**: `3dQwarp`
- **Function**: Non-linear registration using cubic polynomial basis
- **Key Parameters**: -base, -source, -prefix, -blur, -minpatch
- **Typical Use**: High-accuracy normalization to template
- **CWL Status**: ✅ Ready
- **Notes**: Computationally intensive; many options for refinement

#### @auto_tlrc
- **Command**: `@auto_tlrc`
- **Function**: Automated Talairach transformation for anatomical images
- **Key Parameters**: -base, -input, -no_ss (skip skull strip)
- **Typical Use**: Legacy Talairach normalization
- **CWL Status**: ✅ Ready
- **Notes**: Older script; consider @SSwarper for modern workflows

#### @SSwarper
- **Command**: `@SSwarper`
- **Function**: Combined skull stripping and nonlinear warping to template
- **Key Parameters**: -input, -base, -subid
- **Typical Use**: Modern anatomical preprocessing for afni_proc.py
- **CWL Status**: ✅ Ready
- **Notes**: Recommended for current AFNI workflows

#### align_epi_anat.py
- **Command**: `align_epi_anat.py`
- **Function**: Aligns EPI to anatomical with distortion correction options
- **Key Parameters**: -epi, -anat, -epi_base, -cost
- **Typical Use**: Core EPI-to-structural alignment
- **CWL Status**: ✅ Ready
- **Notes**: Python script; handles multiple edge cases

#### 3dUnifize
- **Command**: `3dUnifize`
- **Function**: Corrects intensity inhomogeneity (bias field)
- **Key Parameters**: -prefix, -input, -GM (enhance GM/WM contrast)
- **Typical Use**: Bias correction before segmentation or registration
- **CWL Status**: ✅ Ready
- **Notes**: Fast alternative to N4 for quick preprocessing

#### 3dAutomask
- **Command**: `3dAutomask`
- **Function**: Creates brain mask from EPI data automatically
- **Key Parameters**: -prefix, -dilate, -erode, -clfrac
- **Typical Use**: Generating functional brain masks
- **CWL Status**: ✅ Ready
- **Notes**: Uses intensity clipping algorithm

#### 3dTcat
- **Command**: `3dTcat`
- **Function**: Concatenates datasets in time or selects sub-bricks
- **Key Parameters**: -prefix, input datasets with selectors
- **Typical Use**: Combining runs, removing initial volumes
- **CWL Status**: ✅ Ready
- **Notes**: Bracket notation for sub-brick selection

### Statistical Analysis Tools

#### 3dDeconvolve
- **Command**: `3dDeconvolve`
- **Function**: Multiple linear regression analysis for fMRI
- **Key Parameters**: -input, -polort, -num_stimts, -stim_times, -gltsym
- **Typical Use**: First-level GLM analysis with flexible HRF models
- **CWL Status**: ✅ Ready
- **Notes**: Powerful but complex; many options for design specification

#### 3dREMLfit
- **Command**: `3dREMLfit`
- **Function**: GLM with ARMA(1,1) temporal autocorrelation correction
- **Key Parameters**: -matrix (from 3dDeconvolve), -input, -mask, -Rbuck
- **Typical Use**: More accurate first-level statistics than 3dDeconvolve OLS
- **CWL Status**: ✅ Ready
- **Notes**: Uses matrix file from 3dDeconvolve -x1D_stop

#### 3dMEMA
- **Command**: `3dMEMA`
- **Function**: Mixed Effects Meta Analysis for group studies
- **Key Parameters**: -set (subject data), -mask, -prefix
- **Typical Use**: Group analysis with proper mixed effects modeling
- **CWL Status**: ✅ Ready
- **Notes**: R-based; requires subject-level beta and t-stat inputs

#### 3dANOVA / 3dANOVA2 / 3dANOVA3
- **Command**: `3dANOVA*`
- **Function**: Fixed-effects ANOVA models (1, 2, or 3 factors)
- **Key Parameters**: -type, -alevels, -blevels, -dset, -fa, -fb
- **Typical Use**: Factorial designs in group analysis
- **CWL Status**: ✅ Ready
- **Notes**: Different programs for different factor numbers

#### 3dttest++
- **Command**: `3dttest++`
- **Function**: Two-sample t-test with covariates and advanced options
- **Key Parameters**: -setA, -setB, -prefix, -covariates, -mask
- **Typical Use**: Group comparisons with covariate control
- **CWL Status**: ✅ Ready
- **Notes**: Supersedes older 3dttest; supports -Clustsim

#### 3dMVM
- **Command**: `3dMVM`
- **Function**: Multivariate modeling with ANOVA/ANCOVA
- **Key Parameters**: -dataTable, -bsVars, -wsVars, -qVars
- **Typical Use**: Complex repeated measures and mixed designs
- **CWL Status**: ✅ Ready
- **Notes**: R-based; very flexible for complex designs

#### 3dLME / 3dLMEr
- **Command**: `3dLME` / `3dLMEr`
- **Function**: Linear mixed effects modeling
- **Key Parameters**: -dataTable, -model, -ranEff
- **Typical Use**: Longitudinal data, nested designs
- **CWL Status**: ✅ Ready
- **Notes**: R-based; handles unbalanced designs

#### 3dClustSim
- **Command**: `3dClustSim`
- **Function**: Simulates null distribution for cluster size thresholding
- **Key Parameters**: -mask, -acf (smoothness parameters), -athr, -pthr
- **Typical Use**: Determining cluster size thresholds for multiple comparison correction
- **CWL Status**: ✅ Ready
- **Notes**: Use with -acf parameters from 3dFWHMx

#### 3dFWHMx
- **Command**: `3dFWHMx`
- **Function**: Estimates spatial smoothness of data
- **Key Parameters**: -input, -mask, -acf (output ACF parameters)
- **Typical Use**: Getting smoothness estimates for 3dClustSim
- **CWL Status**: ✅ Ready
- **Notes**: ACF model more accurate than Gaussian FWHM

### Connectivity Analysis Tools

#### 3dNetCorr
- **Command**: `3dNetCorr`
- **Function**: Computes correlation matrices between ROI time series
- **Key Parameters**: -inset, -in_rois, -prefix, -fish_z
- **Typical Use**: Creating connectivity matrices from parcellations
- **CWL Status**: ✅ Ready
- **Notes**: Outputs matrix files and statistics

#### 3dTcorr1D
- **Command**: `3dTcorr1D`
- **Function**: Correlates 4D data with 1D seed time series
- **Key Parameters**: -input 4D, 1D seed file, -prefix
- **Typical Use**: Seed-based correlation analysis
- **CWL Status**: ✅ Ready
- **Notes**: Simple seed correlation implementation

#### 3dTcorrMap
- **Command**: `3dTcorrMap`
- **Function**: Computes various whole-brain correlation metrics
- **Key Parameters**: -input, -mask, -Hist, -Mean, -Zmean
- **Typical Use**: Global connectivity metrics, data exploration
- **CWL Status**: ✅ Ready
- **Notes**: Multiple output metrics available

#### 3dRSFC
- **Command**: `3dRSFC`
- **Function**: Computes resting-state metrics (ALFF, fALFF, RSFA, etc.)
- **Key Parameters**: -input, -prefix, -band, -mask
- **Typical Use**: Amplitude of low-frequency fluctuations analysis
- **CWL Status**: ✅ Ready
- **Notes**: Multiple resting-state metrics in one command

#### 3dGroupInCorr
- **Command**: `3dGroupInCorr`
- **Function**: Interactive group correlation analysis (InstaCorr server)
- **Key Parameters**: -setA, -setB, -batch
- **Typical Use**: Exploring group-level seed correlations
- **CWL Status**: ⚠️ Possible
- **Notes**: Primarily interactive; batch mode available

### ROI and Parcellation Tools

#### 3dROIstats
- **Command**: `3dROIstats`
- **Function**: Extracts statistics from data within ROI masks
- **Key Parameters**: -mask, input dataset, -quiet, -nzmean
- **Typical Use**: Extracting mean values from regions
- **CWL Status**: ✅ Ready
- **Notes**: Text output format

#### 3dmaskave
- **Command**: `3dmaskave`
- **Function**: Outputs average time series from masked region
- **Key Parameters**: -mask, -quiet, input dataset
- **Typical Use**: Simple ROI time series extraction
- **CWL Status**: ✅ Ready
- **Notes**: Simpler than 3dROIstats for time series

#### 3dUndump
- **Command**: `3dUndump`
- **Function**: Creates dataset from coordinate text file
- **Key Parameters**: -master, -xyz, -prefix, coordinate file
- **Typical Use**: Creating spherical ROIs from peak coordinates
- **CWL Status**: ✅ Ready
- **Notes**: Useful for meta-analysis coordinates

#### whereami
- **Command**: `whereami`
- **Function**: Reports atlas labels for coordinates
- **Key Parameters**: -coord_file, -atlas, -tab
- **Typical Use**: Identifying anatomical locations of activations
- **CWL Status**: ✅ Ready
- **Notes**: Requires atlas setup

#### 3dresample
- **Command**: `3dresample`
- **Function**: Resamples dataset to different grid
- **Key Parameters**: -master, -input, -prefix, -rmode
- **Typical Use**: Matching resolution between datasets
- **CWL Status**: ✅ Ready
- **Notes**: Various interpolation methods available

#### 3dfractionize
- **Command**: `3dfractionize`
- **Function**: Resamples ROI/atlas with fractional weighting
- **Key Parameters**: -template, -input, -prefix, -clip
- **Typical Use**: Resampling parcellations to functional resolution
- **CWL Status**: ✅ Ready
- **Notes**: Preserves partial volume information

### Utility Tools

#### 3dcalc
- **Command**: `3dcalc`
- **Function**: Voxelwise calculator with extensive expression support
- **Key Parameters**: -a (input), -expr, -prefix
- **Typical Use**: Mathematical operations, masking, thresholding
- **CWL Status**: ✅ Ready
- **Notes**: Very powerful expression language

#### 3dinfo
- **Command**: `3dinfo`
- **Function**: Displays header information from datasets
- **Key Parameters**: -verb, -n4, -tr, -orient, etc.
- **Typical Use**: QC, scripting decisions based on data properties
- **CWL Status**: ✅ Ready
- **Notes**: Text output; many specific flags

#### 3dTstat
- **Command**: `3dTstat`
- **Function**: Computes temporal statistics (mean, stdev, etc.)
- **Key Parameters**: -mean, -stdev, -prefix, input
- **Typical Use**: Creating mean functional images, variance maps
- **CWL Status**: ✅ Ready
- **Notes**: Multiple statistics available

#### 3dcopy
- **Command**: `3dcopy`
- **Function**: Copies dataset with optional format conversion
- **Key Parameters**: input, output
- **Typical Use**: Format conversion, making editable copies
- **CWL Status**: ✅ Ready
- **Notes**: Simple file operation

#### 3dZeropad
- **Command**: `3dZeropad`
- **Function**: Adds zero-padding around dataset boundaries
- **Key Parameters**: -I/-S/-A/-P/-L/-R (directions), -master, -prefix
- **Typical Use**: Matching matrix sizes, preventing edge effects
- **CWL Status**: ✅ Ready
- **Notes**: Can also crop with negative values

#### 3dNwarpApply
- **Command**: `3dNwarpApply`
- **Function**: Applies nonlinear warps to datasets
- **Key Parameters**: -nwarp, -source, -master, -prefix
- **Typical Use**: Applying 3dQwarp transformations
- **CWL Status**: ✅ Ready
- **Notes**: Can concatenate multiple warps

#### 3dNwarpCat
- **Command**: `3dNwarpCat`
- **Function**: Concatenates multiple warps into one
- **Key Parameters**: -warp1, -warp2, etc., -prefix
- **Typical Use**: Combining transformations efficiently
- **CWL Status**: ✅ Ready
- **Notes**: Reduces interpolation steps

### Pipeline Tools

#### afni_proc.py
- **Command**: `afni_proc.py`
- **Function**: Generates complete preprocessing and analysis scripts
- **Key Parameters**: -subj_id, -dsets, -blocks, -tlrc_base, many others
- **Typical Use**: Creating standardized preprocessing pipelines
- **CWL Status**: ⚠️ Possible
- **Notes**: Generates scripts; could wrap output script in CWL

#### uber_subject.py
- **Command**: `uber_subject.py`
- **Function**: GUI for designing afni_proc.py commands
- **Key Parameters**: GUI-based
- **Typical Use**: Interactive pipeline design
- **CWL Status**: ❌ Not Feasible
- **Notes**: GUI-only; use afni_proc.py directly

---

## SPM (Statistical Parametric Mapping)

SPM is MATLAB-based, requiring special consideration for CWL implementation. Command-line execution is possible through MATLAB batch mode or compiled versions.

### Preprocessing Tools

#### Realign
- **Command**: `spm_realign` (MATLAB function)
- **Function**: Rigid-body motion correction across time series
- **Key Parameters**: Quality, separation, smoothing kernel, interpolation
- **Typical Use**: First motion correction step in SPM pipelines
- **CWL Status**: ⚠️ Possible
- **Notes**: Requires MATLAB runtime or compiled SPM; batch file execution

#### Realign & Unwarp
- **Command**: `spm_uw_estimate` + `spm_uw_apply`
- **Function**: Motion correction with distortion-by-motion interaction correction
- **Key Parameters**: Realign parameters plus distortion estimation
- **Typical Use**: Improved motion correction accounting for susceptibility effects
- **CWL Status**: ⚠️ Possible
- **Notes**: More complex than standard realign; requires fieldmap

#### Slice Timing
- **Command**: `spm_slice_timing`
- **Function**: Temporal interpolation to correct for slice acquisition order
- **Key Parameters**: Number of slices, TR, slice order, reference slice
- **Typical Use**: Temporal alignment in SPM pipelines
- **CWL Status**: ⚠️ Possible
- **Notes**: Order relative to Realign debated in literature

#### Coregister
- **Command**: `spm_coreg`
- **Function**: Rigid-body registration between different modalities
- **Key Parameters**: Reference, source, cost function
- **Typical Use**: Aligning functional to structural images
- **CWL Status**: ⚠️ Possible
- **Notes**: Mutual information cost function default

#### Segment (New Segment/Unified Segmentation)
- **Command**: `spm_preproc_run`
- **Function**: Simultaneous tissue segmentation, bias correction, and normalization
- **Key Parameters**: Tissue probability maps, regularization, warping
- **Typical Use**: Core preprocessing step in modern SPM
- **CWL Status**: ⚠️ Possible
- **Notes**: Produces forward/inverse deformations and tissue maps

#### Normalise (Write)
- **Command**: `spm_write_sn` / `spm_normalise`
- **Function**: Applies spatial normalization to MNI space
- **Key Parameters**: Deformation field, voxel sizes, bounding box
- **Typical Use**: Transforming data to standard space
- **CWL Status**: ⚠️ Possible
- **Notes**: Usually uses deformation from Segment

#### Smooth
- **Command**: `spm_smooth`
- **Function**: Gaussian spatial smoothing
- **Key Parameters**: FWHM (typically 6-8mm)
- **Typical Use**: Increasing SNR and meeting statistical assumptions
- **CWL Status**: ⚠️ Possible
- **Notes**: Simple convolution; separable 3D Gaussian

#### DARTEL
- **Command**: `spm_dartel*` functions
- **Function**: Diffeomorphic registration for improved normalization
- **Key Parameters**: Template creation, flow fields
- **Typical Use**: High-quality group template and normalization
- **CWL Status**: ⚠️ Possible
- **Notes**: Iterative template creation; computationally intensive

#### CAT12 (Extension)
- **Command**: `cat12` batch
- **Function**: Advanced segmentation with cortical thickness and surface extraction
- **Key Parameters**: Many preprocessing and analysis options
- **Typical Use**: VBM with advanced quality control
- **CWL Status**: ⚠️ Possible
- **Notes**: Third-party toolbox; requires separate installation

### Statistical Analysis Tools

#### Specify 1st-level (Model Specification)
- **Command**: `spm_fmri_design`
- **Function**: Creates design matrix from experimental conditions
- **Key Parameters**: Units, TR, conditions (onsets/durations), HRF basis
- **Typical Use**: Defining the GLM structure
- **CWL Status**: ⚠️ Possible
- **Notes**: Generates SPM.mat file

#### Model Estimation
- **Command**: `spm_spm`
- **Function**: Estimates GLM parameters using ReML
- **Key Parameters**: SPM.mat specification
- **Typical Use**: Computing beta weights and variance estimates
- **CWL Status**: ⚠️ Possible
- **Notes**: Core statistical computation

#### Contrast Manager
- **Command**: `spm_contrasts`
- **Function**: Defines and computes contrast images
- **Key Parameters**: Contrast vectors/matrices, contrast names
- **Typical Use**: Testing specific hypotheses
- **CWL Status**: ⚠️ Possible
- **Notes**: T and F contrasts supported

#### Results
- **Command**: `spm_results_ui` (GUI) / `spm_getSPM`
- **Function**: Statistical inference and thresholding
- **Key Parameters**: Height threshold, extent threshold, correction method
- **Typical Use**: Viewing and saving thresholded statistical maps
- **CWL Status**: ⚠️ Possible
- **Notes**: Batch mode available; outputs tables and figures

#### Factorial Design Specification
- **Command**: `spm_spm` (2nd level)
- **Function**: Group-level statistical designs
- **Key Parameters**: Design type (one-sample, two-sample, ANOVA, etc.)
- **Typical Use**: Random effects group analysis
- **CWL Status**: ⚠️ Possible
- **Notes**: Flexible factorial for complex designs

### Connectivity Tools (SPM Extensions)

#### CONN Toolbox
- **Command**: `conn` batch mode
- **Function**: Complete functional connectivity analysis pipeline
- **Key Parameters**: Preprocessing, denoising, first-level, second-level options
- **Typical Use**: ROI-to-ROI, seed-based, ICA-based connectivity
- **CWL Status**: ⚠️ Possible
- **Notes**: Comprehensive toolbox; has command-line interface

#### DCM (Dynamic Causal Modeling)
- **Command**: `spm_dcm_*` functions
- **Function**: Effective connectivity modeling of neural interactions
- **Key Parameters**: VOIs, model structure, priors
- **Typical Use**: Inferring directional connectivity
- **CWL Status**: ⚠️ Possible
- **Notes**: Complex model specification; Bayesian model comparison

#### PPI (Psychophysiological Interaction)
- **Command**: `spm_peb_ppi`
- **Function**: Context-dependent connectivity analysis
- **Key Parameters**: VOI time series, psychological variable
- **Typical Use**: How connectivity changes with task
- **CWL Status**: ⚠️ Possible
- **Notes**: First-level connectivity analysis

### Utility Tools

#### Display
- **Command**: `spm_image` / `spm_check_registration`
- **Function**: Image visualization and registration quality check
- **Key Parameters**: Images to display
- **Typical Use**: Visual QC
- **CWL Status**: ❌ Not Feasible
- **Notes**: GUI-based visualization

#### ImCalc (Image Calculator)
- **Command**: `spm_imcalc`
- **Function**: Mathematical operations on images
- **Key Parameters**: Input images, expression, output
- **Typical Use**: Masking, thresholding, combining images
- **CWL Status**: ⚠️ Possible
- **Notes**: Similar to fslmaths/3dcalc

#### Deformations
- **Command**: `spm_deformations`
- **Function**: Applies, composes, or inverts deformation fields
- **Key Parameters**: Deformation type, images to transform
- **Typical Use**: Applying normalization, inverse normalization
- **CWL Status**: ⚠️ Possible
- **Notes**: Flexible deformation handling

---

## FreeSurfer

FreeSurfer provides comprehensive surface-based analysis. Most tools are command-line based with good CWL compatibility.

### Surface Reconstruction Pipeline

#### recon-all
- **Command**: `recon-all`
- **Function**: Complete cortical reconstruction and parcellation pipeline
- **Key Parameters**: -s (subject), -i (input), -all, -autorecon1/2/3
- **Typical Use**: Full structural processing from T1 to surfaces and parcellation
- **CWL Status**: ⚠️ Possible
- **Notes**: Very long runtime (6-24 hours); can run stages separately

#### mri_convert
- **Command**: `mri_convert`
- **Function**: Format conversion between neuroimaging formats
- **Key Parameters**: Input, output, conforming options
- **Typical Use**: Converting DICOM to NIfTI, conforming to FreeSurfer standards
- **CWL Status**: ✅ Ready
- **Notes**: Handles many formats; essential utility

#### mri_watershed
- **Command**: `mri_watershed`
- **Function**: Skull stripping using watershed algorithm
- **Key Parameters**: Input T1, output brain
- **Typical Use**: Brain extraction within recon-all
- **CWL Status**: ✅ Ready
- **Notes**: Part of autorecon1

#### mri_normalize
- **Command**: `mri_normalize`
- **Function**: Intensity normalization for T1 images
- **Key Parameters**: Input, output, normalization options
- **Typical Use**: Preparing T1 for segmentation
- **CWL Status**: ✅ Ready
- **Notes**: Multiple normalization algorithms

#### mri_segment
- **Command**: `mri_segment`
- **Function**: White matter segmentation
- **Key Parameters**: Input normalized volume
- **Typical Use**: WM identification for surface reconstruction
- **CWL Status**: ✅ Ready
- **Notes**: Part of autorecon2

#### mris_inflate
- **Command**: `mris_inflate`
- **Function**: Inflates cortical surface for visualization
- **Key Parameters**: Input surface, output inflated surface
- **Typical Use**: Creating inflated surfaces for visualization
- **CWL Status**: ✅ Ready
- **Notes**: Part of recon-all

#### mris_sphere
- **Command**: `mris_sphere`
- **Function**: Maps surface to sphere for registration
- **Key Parameters**: Input surface, output spherical surface
- **Typical Use**: Preparing for spherical registration
- **CWL Status**: ✅ Ready
- **Notes**: Required for atlas registration

### Parcellation and Labeling

#### mri_aparc2aseg
- **Command**: `mri_aparc2aseg`
- **Function**: Combines cortical parcellation with subcortical segmentation
- **Key Parameters**: Subject directory, annotation file
- **Typical Use**: Creating volumetric parcellation from surface labels
- **CWL Status**: ✅ Ready
- **Notes**: Multiple atlas options (Desikan, Destrieux, etc.)

#### mri_annotation2label
- **Command**: `mri_annotation2label`
- **Function**: Converts surface annotation to individual label files
- **Key Parameters**: Subject, hemisphere, annotation
- **Typical Use**: Extracting individual ROIs from parcellation
- **CWL Status**: ✅ Ready
- **Notes**: Creates separate file per region

#### mris_ca_label
- **Command**: `mris_ca_label`
- **Function**: Automatic cortical labeling based on atlas
- **Key Parameters**: Subject, hemisphere, atlas
- **Typical Use**: Applying parcellation atlas to individual
- **CWL Status**: ✅ Ready
- **Notes**: Core labeling step in recon-all

#### mri_label2vol
- **Command**: `mri_label2vol`
- **Function**: Converts surface labels to volume space
- **Key Parameters**: Label file, template volume, registration
- **Typical Use**: Creating volumetric ROIs from surface ROIs
- **CWL Status**: ✅ Ready
- **Notes**: Useful for ROI analyses

### Functional Analysis

#### bbregister
- **Command**: `bbregister`
- **Function**: Boundary-based registration of EPI to FreeSurfer anatomy
- **Key Parameters**: Subject, --mov (functional), --bold, --init-fsl
- **Typical Use**: High-quality EPI to T1 registration using surfaces
- **CWL Status**: ✅ Ready
- **Notes**: Often more accurate than volume-based registration

#### mri_vol2surf
- **Command**: `mri_vol2surf`
- **Function**: Projects volume data onto cortical surface
- **Key Parameters**: Volume, registration, surface, output
- **Typical Use**: Mapping functional data to surface for analysis
- **CWL Status**: ✅ Ready
- **Notes**: Multiple projection methods (midpoint, max, etc.)

#### mri_surf2vol
- **Command**: `mri_surf2vol`
- **Function**: Projects surface data back to volume
- **Key Parameters**: Surface data, template volume, output
- **Typical Use**: Converting surface results to volume space
- **CWL Status**: ✅ Ready
- **Notes**: Inverse of mri_vol2surf

#### mris_preproc
- **Command**: `mris_preproc`
- **Function**: Prepares surface data for group analysis
- **Key Parameters**: Subject list, measure, target surface, output
- **Typical Use**: Concatenating subjects for surface group analysis
- **CWL Status**: ✅ Ready
- **Notes**: Handles resampling to common surface

#### mri_glmfit
- **Command**: `mri_glmfit`
- **Function**: General linear model on surface or volume data
- **Key Parameters**: --y (data), --fsgd (design), --C (contrasts)
- **Typical Use**: Surface-based group analysis
- **CWL Status**: ✅ Ready
- **Notes**: Full GLM capabilities

### Morphometry

#### mris_anatomical_stats
- **Command**: `mris_anatomical_stats`
- **Function**: Computes surface-based morphometric measures
- **Key Parameters**: Subject, hemisphere, annotation
- **Typical Use**: Extracting thickness, area, volume per region
- **CWL Status**: ✅ Ready
- **Notes**: Outputs table of regional measures

#### mri_segstats
- **Command**: `mri_segstats`
- **Function**: Computes statistics from segmentation
- **Key Parameters**: --seg (segmentation), --i (intensity volume)
- **Typical Use**: Extracting volumes, mean intensities per structure
- **CWL Status**: ✅ Ready
- **Notes**: Works with any segmentation/parcellation

#### aparcstats2table
- **Command**: `aparcstats2table`
- **Function**: Collects parcellation stats across subjects into table
- **Key Parameters**: --subjects, --hemi, --meas, --tablefile
- **Typical Use**: Creating group spreadsheet for statistical analysis
- **CWL Status**: ✅ Ready
- **Notes**: Multiple measures available

#### asegstats2table
- **Command**: `asegstats2table`
- **Function**: Collects subcortical stats across subjects into table
- **Key Parameters**: --subjects, --meas, --tablefile
- **Typical Use**: Group analysis of subcortical volumes
- **CWL Status**: ✅ Ready
- **Notes**: Complements aparcstats2table

### Diffusion (TRACULA)

#### trac-all
- **Command**: `trac-all`
- **Function**: Complete TRACULA tractography pipeline
- **Key Parameters**: Configuration file with all parameters
- **Typical Use**: Automated probabilistic tractography
- **CWL Status**: ⚠️ Possible
- **Notes**: Long runtime; configuration file based

#### dmri_postreg
- **Command**: `dmri_postreg`
- **Function**: Post-registration processing for diffusion
- **Key Parameters**: Subject, registration type
- **Typical Use**: Part of TRACULA pipeline
- **CWL Status**: ✅ Ready
- **Notes**: Within trac-all workflow

---

## ANTs (Advanced Normalization Tools)

ANTs provides state-of-the-art registration algorithms. All tools are command-line based with excellent CWL compatibility.

### Registration Tools

#### antsRegistration
- **Command**: `antsRegistration`
- **Function**: Comprehensive image registration with multiple stages
- **Key Parameters**: Fixed, moving, transforms, metrics, convergence
- **Typical Use**: High-quality registration with full control
- **CWL Status**: ✅ Ready
- **Notes**: Complex parameter specification; very flexible

#### antsRegistrationSyN.sh
- **Command**: `antsRegistrationSyN.sh`
- **Function**: Symmetric normalization with sensible defaults
- **Key Parameters**: -f (fixed), -m (moving), -t (transform type), -o (output)
- **Typical Use**: Standard registration with good defaults
- **CWL Status**: ✅ Ready
- **Notes**: Wrapper script; easier than antsRegistration

#### antsRegistrationSyNQuick.sh
- **Command**: `antsRegistrationSyNQuick.sh`
- **Function**: Fast SyN registration with reduced parameters
- **Key Parameters**: Same as SyN.sh
- **Typical Use**: Quick registration when speed is priority
- **CWL Status**: ✅ Ready
- **Notes**: Good for initial alignment or large datasets

#### antsApplyTransforms
- **Command**: `antsApplyTransforms`
- **Function**: Applies transformations to images
- **Key Parameters**: -i (input), -r (reference), -t (transforms), -o (output)
- **Typical Use**: Applying registration to data or labels
- **CWL Status**: ✅ Ready
- **Notes**: Transform order is last-to-first

#### antsMotionCorr
- **Command**: `antsMotionCorr`
- **Function**: Motion correction using ANTs registration
- **Key Parameters**: -d (dimension), -a (average), -o (output)
- **Typical Use**: High-quality motion correction
- **CWL Status**: ✅ Ready
- **Notes**: Can be slower but more accurate than MCFLIRT

#### antsIntermodalityIntrasubject.sh
- **Command**: `antsIntermodalityIntrasubject.sh`
- **Function**: Registration between modalities within subject
- **Key Parameters**: -d (dimension), -i (source), -r (target), -t (transform)
- **Typical Use**: T1-to-T2, fMRI-to-T1 alignment
- **CWL Status**: ✅ Ready
- **Notes**: Optimized for same-subject cross-modal registration

### Segmentation Tools

#### Atropos
- **Command**: `Atropos`
- **Function**: Probabilistic tissue segmentation using EM algorithm
- **Key Parameters**: -d (dimension), -a (input), -x (mask), -c (classes)
- **Typical Use**: GMM-based brain tissue segmentation
- **CWL Status**: ✅ Ready
- **Notes**: Can use priors from previous segmentation

#### antsAtroposN4.sh
- **Command**: `antsAtroposN4.sh`
- **Function**: Combined bias correction and segmentation
- **Key Parameters**: -d (dimension), -a (input), -x (mask)
- **Typical Use**: Iterative N4 + segmentation for better results
- **CWL Status**: ✅ Ready
- **Notes**: Recommended over separate N4 + Atropos

#### antsBrainExtraction.sh
- **Command**: `antsBrainExtraction.sh`
- **Function**: Brain extraction using registration and templates
- **Key Parameters**: -d (dimension), -a (input), -e (template), -m (probability mask)
- **Typical Use**: High-quality skull stripping
- **CWL Status**: ✅ Ready
- **Notes**: Requires template with brain mask

#### antsCorticalThickness.sh
- **Command**: `antsCorticalThickness.sh`
- **Function**: Complete cortical thickness estimation pipeline
- **Key Parameters**: -d, -a (T1), -e (template), -t (tissue priors)
- **Typical Use**: DiReCT-based cortical thickness measurement
- **CWL Status**: ✅ Ready
- **Notes**: Comprehensive pipeline; long runtime

#### KellyKapowski (DiReCT)
- **Command**: `KellyKapowski`
- **Function**: Diffeomorphic Registration-based Cortical Thickness
- **Key Parameters**: -d, -s (segmentation), -g (GM probability), -w (WM probability)
- **Typical Use**: Computing cortical thickness from segmentation
- **CWL Status**: ✅ Ready
- **Notes**: Core algorithm in antsCorticalThickness.sh

### Utility Tools

#### N4BiasFieldCorrection
- **Command**: `N4BiasFieldCorrection`
- **Function**: Advanced bias field correction using N4 algorithm
- **Key Parameters**: -d (dimension), -i (input), -o (output), -s (shrink factor)
- **Typical Use**: Removing intensity inhomogeneity
- **CWL Status**: ✅ Ready
- **Notes**: Gold standard for bias correction

#### DenoiseImage
- **Command**: `DenoiseImage`
- **Function**: Non-local means denoising
- **Key Parameters**: -d (dimension), -i (input), -o (output), -v (noise model)
- **Typical Use**: Noise reduction while preserving edges
- **CWL Status**: ✅ Ready
- **Notes**: Rician noise model for MRI

#### ImageMath
- **Command**: `ImageMath`
- **Function**: Various image operations and measurements
- **Key Parameters**: dimension, output, operation, input(s)
- **Typical Use**: Mathematical operations, morphological operations
- **CWL Status**: ✅ Ready
- **Notes**: Many operations available

#### ThresholdImage
- **Command**: `ThresholdImage`
- **Function**: Thresholding with various methods
- **Key Parameters**: dimension, input, output, threshold parameters
- **Typical Use**: Creating binary masks, Otsu thresholding
- **CWL Status**: ✅ Ready
- **Notes**: Multiple thresholding algorithms

#### LabelGeometryMeasures
- **Command**: `LabelGeometryMeasures`
- **Function**: Computes geometric measures for labeled regions
- **Key Parameters**: dimension, label image, intensity image (optional)
- **Typical Use**: Volume, centroid, and shape measures per label
- **CWL Status**: ✅ Ready
- **Notes**: Useful for ROI characterization

#### antsJointLabelFusion
- **Command**: `antsJointLabelFusion.sh`
- **Function**: Multi-atlas segmentation with joint label fusion
- **Key Parameters**: -d, -t (target), -g (atlas images), -l (atlas labels)
- **Typical Use**: High-accuracy segmentation using multiple atlases
- **CWL Status**: ✅ Ready
- **Notes**: Computationally intensive; excellent results

---

## Python-Based Tools

### Nipype

#### Workflow Framework
- **Function**: Unified interface for neuroimaging tools, workflow management
- **Key Components**: Interfaces (tool wrappers), Nodes, Workflows, DataGrabber, DataSink
- **Typical Use**: Building reproducible pipelines combining multiple packages
- **CWL Status**: ⚠️ Possible
- **Notes**: Can export workflows to CWL format; individual interfaces wrap other tools

### Nilearn

#### Machine Learning & Visualization
- **Function**: Statistical learning on neuroimaging data, visualization
- **Key Components**: masking, signal extraction, decoding, plotting
- **Typical Use**: MVPA, visualization, ROI extraction
- **CWL Status**: ⚠️ Possible
- **Notes**: Python library; requires wrapper scripts for CWL

### PyMVPA

#### Multivariate Pattern Analysis
- **Function**: Advanced MVPA and machine learning for neuroimaging
- **Key Components**: Datasets, classifiers, cross-validation, searchlight
- **Typical Use**: Decoding, searchlight analysis, RSA
- **CWL Status**: ⚠️ Possible
- **Notes**: Python library; can be wrapped

---

## Specialized Pipelines

### fMRIPrep

#### Standardized Preprocessing
- **Command**: `fmriprep`
- **Function**: Robust, reproducible preprocessing pipeline
- **Key Parameters**: BIDS input, output directory, participant label
- **Typical Use**: Standardized preprocessing with comprehensive QC
- **CWL Status**: ⚠️ Possible
- **Notes**: Already designed as pipeline; outputs in multiple spaces

### MRIQC

#### Quality Control
- **Command**: `mriqc`
- **Function**: Automated quality metrics extraction
- **Key Parameters**: BIDS input, output directory
- **Typical Use**: Automated QC before preprocessing
- **CWL Status**: ⚠️ Possible
- **Notes**: Produces visual and quantitative QC reports

### ICA-AROMA

#### Motion Denoising
- **Command**: `ICA_AROMA.py`
- **Function**: Automatic removal of motion artifacts using ICA
- **Key Parameters**: -i (input), -mc (motion parameters), -o (output)
- **Typical Use**: Denoising after MELODIC
- **CWL Status**: ✅ Ready
- **Notes**: Python script; straightforward implementation

---

## Connectivity Analysis Tools

### CONN Toolbox
- **Function**: Complete functional connectivity analysis
- **Platform**: MATLAB/SPM-based
- **Key Features**: Preprocessing, denoising, ROI-to-ROI, seed-based, ICA
- **CWL Status**: ⚠️ Possible
- **Notes**: Has batch/scripting mode

### DPABI/DPARSF
- **Function**: Resting-state fMRI processing and analysis
- **Platform**: MATLAB/SPM-based
- **Key Features**: Preprocessing, ALFF/fALFF/ReHo, functional connectivity
- **CWL Status**: ⚠️ Possible
- **Notes**: Popular for resting-state studies

### Brain Connectivity Toolbox
- **Function**: Graph theoretical analysis of brain networks
- **Platform**: MATLAB (also Python version: bctpy)
- **Key Features**: Network metrics, modularity, centrality, efficiency
- **CWL Status**: ⚠️ Possible
- **Notes**: Typically operates on connectivity matrices

### GRETNA
- **Function**: Graph-theory network analysis
- **Platform**: MATLAB-based
- **Key Features**: Network construction, global/local metrics, hub analysis
- **CWL Status**: ⚠️ Possible
- **Notes**: GUI available but batch mode possible

---

## Visualization Tools

### FSLeyes
- **Command**: `fsleyes`
- **Function**: FSL image viewer and analysis tool
- **CWL Status**: ❌ Not Feasible
- **Notes**: GUI-based; can generate snapshots via command line (fsleyes render)

### AFNI GUI
- **Command**: `afni`
- **Function**: AFNI visualization and analysis interface
- **CWL Status**: ❌ Not Feasible
- **Notes**: Interactive GUI; some features via DrivAfni scripting

### Freeview
- **Command**: `freeview`
- **Function**: FreeSurfer visualization tool
- **CWL Status**: ❌ Not Feasible
- **Notes**: GUI-based; limited scripting support

### MRIcroGL
- **Command**: `mricrogl`
- **Function**: 3D volume rendering and visualization
- **CWL Status**: ⚠️ Possible
- **Notes**: Has scripting mode for automated rendering

### Connectome Workbench
- **Command**: `wb_command` / `wb_view`
- **Function**: HCP data visualization and surface analysis
- **CWL Status**: ✅ Ready (wb_command) / ❌ Not Feasible (wb_view)
- **Notes**: wb_command provides many CWL-compatible operations

---

## Appendix: CWL Implementation Recommendations

### Priority 1: Core Preprocessing (High CWL Compatibility)
These tools should be implemented first as they form the backbone of most workflows:

1. **Brain Extraction**: BET (FSL), 3dSkullStrip (AFNI), antsBrainExtraction.sh (ANTs)
2. **Motion Correction**: MCFLIRT (FSL), 3dvolreg (AFNI)
3. **Slice Timing**: SliceTimer (FSL), 3dTshift (AFNI)
4. **Registration**: FLIRT/FNIRT (FSL), 3dAllineate/3dQwarp (AFNI), antsRegistration (ANTs)
5. **Smoothing**: SUSAN/fslmaths (FSL), 3dBlurToFWHM/3dmerge (AFNI)
6. **Segmentation**: FAST (FSL), Atropos (ANTs)

### Priority 2: Statistical Analysis
First-level and group analysis tools:

1. **First Level**: FILM/FEAT (FSL), 3dDeconvolve/3dREMLfit (AFNI)
2. **Group Level**: FLAME/Randomise (FSL), 3dttest++/3dMEMA (AFNI)
3. **Utilities**: fslmaths (FSL), 3dcalc (AFNI), ImageMath (ANTs)

### Priority 3: Advanced Analysis
More specialized tools:

1. **ICA/Denoising**: MELODIC (FSL), ICA-AROMA
2. **Connectivity**: 3dNetCorr (AFNI), seed-based correlation tools
3. **Surface-based**: FreeSurfer tools (bbregister, mri_vol2surf)

### Implementation Notes

#### For FSL Tools
- Most straightforward CWL implementation
- Consistent parameter syntax
- Well-documented inputs/outputs

#### For AFNI Tools
- Generally command-line ready
- May output multiple files requiring careful output capture
- Some R-based tools need R runtime

#### For SPM Tools
- Require MATLAB runtime or compiled versions
- Batch mode execution through matlabbatch
- Consider using Nipype SPM interfaces

#### For FreeSurfer Tools
- Subject directory structure important
- Long-running recon-all may need special handling
- Environment variables required (SUBJECTS_DIR, FREESURFER_HOME)

#### For ANTs Tools
- Excellent CWL compatibility
- Complex parameter syntax for antsRegistration
- Wrapper scripts simplify common operations
