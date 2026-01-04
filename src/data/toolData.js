/**
 * Tool metadata organized by library and subsection.
 * Each tool contains: name, function description, typical use case, and documentation URL.
 * Extracted from fmri_tools_reference.md
 */

export const toolsByLibrary = {
  FSL: {
    'Preprocessing': [
      { name: 'bet', fullName: 'Brain Extraction Tool', function: 'Removes non-brain tissue from structural and functional images using a surface model approach', typicalUse: 'First step in most preprocessing pipelines to isolate brain tissue', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/BET' },
      { name: 'fast', fullName: "FMRIB's Automated Segmentation Tool", function: 'Segments brain images into gray matter, white matter, and CSF with bias field correction', typicalUse: 'Tissue probability maps for normalization, VBM studies, or masking', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FAST' },
      { name: 'mcflirt', fullName: 'Motion Correction FLIRT', function: 'Intra-modal motion correction for fMRI time series using rigid-body transformations', typicalUse: 'Correcting head motion in functional data; motion parameters used as nuisance regressors', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/MCFLIRT' },
      { name: 'flirt', fullName: "FMRIB's Linear Image Registration Tool", function: 'Linear (affine) registration between images using 6, 9, or 12 degrees of freedom', typicalUse: 'EPI-to-structural alignment, structural-to-standard registration', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FLIRT' },
      { name: 'fnirt', fullName: "FMRIB's Non-linear Image Registration Tool", function: 'Non-linear registration using spline-based deformations for precise anatomical alignment', typicalUse: 'High-accuracy normalization to MNI space for group analyses', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FNIRT' },
      { name: 'fugue', fullName: "FMRIB's Utility for Geometrically Unwarping EPIs", function: 'Corrects geometric distortions in EPI images using fieldmap data', typicalUse: 'Distortion correction when fieldmap data is available', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FUGUE' },
      { name: 'topup', fullName: 'Tool for Estimating and Correcting Susceptibility-Induced Distortions', function: 'Estimates and corrects susceptibility-induced distortions using reversed phase-encode images', typicalUse: 'Distortion correction using blip-up/blip-down acquisitions', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/topup' },
      { name: 'susan', fullName: 'Smallest Univalue Segment Assimilating Nucleus', function: 'Edge-preserving noise reduction that smooths within tissue boundaries', typicalUse: 'Noise reduction while preserving structural boundaries', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/SUSAN' },
      { name: 'slicetimer', fullName: "FMRIB's Interpolation for Slice Timing", function: 'Corrects for differences in slice acquisition times within a volume', typicalUse: 'Temporal alignment of slices acquired at different times', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/SliceTimer' },
      { name: 'fslreorient2std', fullName: 'FSL Reorient to Standard', function: 'Reorients images to match standard (MNI) orientation', typicalUse: 'Ensuring consistent orientation before processing', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Orientation%20Explained' },
      { name: 'fslsplit', fullName: 'FSL Split', function: 'Splits 4D time series into individual 3D volumes', typicalUse: 'Processing individual volumes separately, quality control', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Fslutils' },
      { name: 'fslmerge', fullName: 'FSL Merge', function: 'Concatenates multiple 3D volumes into a 4D time series', typicalUse: 'Combining processed volumes, concatenating runs', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Fslutils' }
    ],
    'Statistical': [
      { name: 'film_gls', fullName: "FMRIB's Improved Linear Model", function: 'Fits GLM to fMRI time series with autocorrelation correction', typicalUse: 'First-level statistical analysis within FEAT or standalone', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FILM' },
      { name: 'flameo', fullName: "FMRIB's Local Analysis of Mixed Effects", function: 'Mixed-effects group analysis accounting for within and between-subject variance', typicalUse: 'Second-level group analyses with proper random effects', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FLAME' },
      { name: 'randomise', fullName: 'FSL Randomise Permutation Testing', function: 'Non-parametric permutation testing for statistical inference', typicalUse: 'Group-level inference with family-wise error correction', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Randomise' }
    ],
    'ICA/Denoising': [
      { name: 'melodic', fullName: 'Multivariate Exploratory Linear Optimized Decomposition into Independent Components', function: 'Probabilistic ICA for separating fMRI signals into independent components', typicalUse: 'Data exploration, artifact identification, resting-state analysis', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/MELODIC' },
      { name: 'dual_regression', fullName: 'FSL Dual Regression', function: 'Projects group ICA components onto individual subjects', typicalUse: 'Subject-level ICA-based connectivity analysis', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/DualRegression' }
    ],
    'Diffusion/Structural': [
      { name: 'probtrackx2', fullName: 'Probabilistic Tractography with Crossing Fibres', function: 'Probabilistic tractography using crossing fiber models', typicalUse: 'White matter connectivity analysis, tract-based statistics', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FDT/UserGuide#PROBTRACKX' },
      { name: 'run_first_all', fullName: "FMRIB's Integrated Registration and Segmentation Tool", function: 'Automated subcortical structure segmentation', typicalUse: 'Volumetric analysis of subcortical structures', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FIRST' },
      { name: 'siena', fullName: 'Structural Image Evaluation using Normalisation of Atrophy', function: 'Longitudinal brain atrophy estimation between two timepoints', typicalUse: 'Measuring brain volume change over time', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/SIENA' },
      { name: 'sienax', fullName: 'SIENA Cross-Sectional', function: 'Cross-sectional brain volume estimation', typicalUse: 'Single timepoint normalized brain volume measures', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/SIENA' },
      { name: 'fsl_anat', fullName: 'FSL Anatomical Processing Pipeline', function: 'Comprehensive anatomical processing pipeline', typicalUse: 'Full structural preprocessing from T1 image', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/fsl_anat' }
    ],
    'Utilities': [
      { name: 'fslmaths', fullName: 'FSL Maths', function: 'Voxelwise mathematical operations on images', typicalUse: 'Mathematical operations, masking, thresholding', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Fslutils' },
      { name: 'fslstats', fullName: 'FSL Statistics', function: 'Computes various statistics from image data', typicalUse: 'Extracting summary statistics from ROIs', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Fslutils' },
      { name: 'fslroi', fullName: 'FSL Region of Interest Extraction', function: 'Extracts sub-regions from images (spatial or temporal)', typicalUse: 'Cropping images, selecting time points', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Fslutils' },
      { name: 'fslmeants', fullName: 'FSL Mean Time Series', function: 'Extracts mean time series from mask or coordinates', typicalUse: 'ROI time series extraction for connectivity analysis', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Fslutils' },
      { name: 'cluster', fullName: 'FSL Cluster', function: 'Forms clusters from thresholded statistical images', typicalUse: 'Cluster-based thresholding, extracting peak coordinates', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Cluster' },
      { name: 'applywarp', fullName: 'FSL Apply Warp', function: 'Applies warp fields to transform images', typicalUse: 'Applying normalization warps to functional data', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FNIRT/UserGuide#Applying_the_warps' },
      { name: 'invwarp', fullName: 'FSL Invert Warp', function: 'Inverts a warp field', typicalUse: 'Creating inverse transformations for atlas-to-native mapping', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FNIRT/UserGuide#Inverting_warps' },
      { name: 'convertwarp', fullName: 'FSL Convert Warp', function: 'Combines or converts between warp formats', typicalUse: 'Concatenating multiple transformations efficiently', docUrl: 'https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FNIRT/UserGuide#Combining_warps' }
    ]
  },

  AFNI: {
    'Preprocessing': [
      { name: '3dSkullStrip', fullName: 'AFNI 3D Skull Strip', function: 'Removes non-brain tissue using an expansion algorithm', typicalUse: 'Brain extraction for functional or structural images', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dSkullStrip.html' },
      { name: '3dvolreg', fullName: 'AFNI 3D Volume Registration', function: 'Rigid-body motion correction by registering all volumes to a base', typicalUse: 'Motion correction; outputs 6 motion parameters', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dvolreg.html' },
      { name: '3dTshift', fullName: 'AFNI 3D Temporal Shift', function: 'Corrects for slice timing differences via temporal interpolation', typicalUse: 'Aligning all slices to same temporal reference', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dTshift.html' },
      { name: '3dDespike', fullName: 'AFNI 3D Despike', function: 'Removes spike artifacts from time series using L1 fit', typicalUse: 'Artifact removal before other preprocessing', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dDespike.html' },
      { name: '3dBandpass', fullName: 'AFNI 3D Bandpass Filter', function: 'Bandpass filtering of time series with optional regression', typicalUse: 'Resting-state frequency filtering (typically 0.01-0.1 Hz)', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dBandpass.html' },
      { name: '3dBlurToFWHM', fullName: 'AFNI 3D Blur to Full Width at Half Maximum', function: 'Spatially smooths data to achieve target smoothness level', typicalUse: 'Achieving consistent smoothness across subjects/studies', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dBlurToFWHM.html' },
      { name: '3dmerge', fullName: 'AFNI 3D Merge', function: 'Spatial filtering and dataset merging operations', typicalUse: 'Gaussian smoothing of functional data', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dmerge.html' },
      { name: '3dAllineate', fullName: 'AFNI 3D Allineate', function: 'Linear registration with multiple cost functions', typicalUse: 'Affine alignment between modalities or to standard space', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dAllineate.html' },
      { name: '3dQwarp', fullName: 'AFNI 3D Nonlinear Warp', function: 'Non-linear registration using cubic polynomial basis', typicalUse: 'High-accuracy normalization to template', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dQwarp.html' },
      { name: '@auto_tlrc', fullName: 'AFNI Automated Talairach Transformation', function: 'Automated Talairach transformation for anatomical images', typicalUse: 'Legacy Talairach normalization', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/@auto_tlrc.html' },
      { name: '@SSwarper', fullName: 'AFNI Skull Strip and Warp', function: 'Combined skull stripping and nonlinear warping to template', typicalUse: 'Modern anatomical preprocessing for afni_proc.py', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/@SSwarper.html' },
      { name: 'align_epi_anat.py', fullName: 'AFNI Align EPI to Anatomy', function: 'Aligns EPI to anatomical with distortion correction options', typicalUse: 'Core EPI-to-structural alignment', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/align_epi_anat.py.html' },
      { name: '3dUnifize', fullName: 'AFNI 3D Unifize', function: 'Corrects intensity inhomogeneity (bias field)', typicalUse: 'Bias correction before segmentation or registration', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dUnifize.html' },
      { name: '3dAutomask', fullName: 'AFNI 3D Automask', function: 'Creates brain mask from EPI data automatically', typicalUse: 'Generating functional brain masks', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dAutomask.html' },
      { name: '3dTcat', fullName: 'AFNI 3D Temporal Concatenate', function: 'Concatenates datasets in time or selects sub-bricks', typicalUse: 'Combining runs, removing initial volumes', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dTcat.html' }
    ],
    'Statistical': [
      { name: '3dDeconvolve', fullName: 'AFNI 3D Deconvolve', function: 'Multiple linear regression analysis for fMRI', typicalUse: 'First-level GLM analysis with flexible HRF models', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dDeconvolve.html' },
      { name: '3dREMLfit', fullName: 'AFNI 3D REML Fit', function: 'GLM with ARMA(1,1) temporal autocorrelation correction', typicalUse: 'More accurate first-level statistics than 3dDeconvolve OLS', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dREMLfit.html' },
      { name: '3dMEMA', fullName: 'AFNI 3D Mixed Effects Meta Analysis', function: 'Mixed Effects Meta Analysis for group studies', typicalUse: 'Group analysis with proper mixed effects modeling', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dMEMA.html' },
      { name: '3dANOVA', fullName: 'AFNI 3D ANOVA', function: 'Fixed-effects one-way ANOVA', typicalUse: 'Single-factor group analysis', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dANOVA.html' },
      { name: '3dANOVA2', fullName: 'AFNI 3D Two-Way ANOVA', function: 'Fixed-effects two-way ANOVA', typicalUse: 'Two-factor factorial designs', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dANOVA2.html' },
      { name: '3dANOVA3', fullName: 'AFNI 3D Three-Way ANOVA', function: 'Fixed-effects three-way ANOVA', typicalUse: 'Three-factor factorial designs', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dANOVA3.html' },
      { name: '3dttest++', fullName: 'AFNI 3D T-Test', function: 'Two-sample t-test with covariates and advanced options', typicalUse: 'Group comparisons with covariate control', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dttest++.html' },
      { name: '3dMVM', fullName: 'AFNI 3D MultiVariate Modeling', function: 'Multivariate modeling with ANOVA/ANCOVA', typicalUse: 'Complex repeated measures and mixed designs', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dMVM.html' },
      { name: '3dLME', fullName: 'AFNI 3D Linear Mixed Effects', function: 'Linear mixed effects modeling', typicalUse: 'Longitudinal data, nested designs', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dLME.html' },
      { name: '3dLMEr', fullName: 'AFNI 3D Linear Mixed Effects with R', function: 'Linear mixed effects with R integration', typicalUse: 'Flexible mixed effects with R formula syntax', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dLMEr.html' },
      { name: '3dClustSim', fullName: 'AFNI 3D Cluster Simulation', function: 'Simulates null distribution for cluster size thresholding', typicalUse: 'Determining cluster size thresholds for multiple comparison correction', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dClustSim.html' },
      { name: '3dFWHMx', fullName: 'AFNI 3D FWHM Estimation', function: 'Estimates spatial smoothness of data', typicalUse: 'Getting smoothness estimates for 3dClustSim', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dFWHMx.html' }
    ],
    'Connectivity': [
      { name: '3dNetCorr', fullName: 'AFNI 3D Network Correlation', function: 'Computes correlation matrices between ROI time series', typicalUse: 'Creating connectivity matrices from parcellations', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dNetCorr.html' },
      { name: '3dTcorr1D', fullName: 'AFNI 3D Temporal Correlation 1D', function: 'Correlates 4D data with 1D seed time series', typicalUse: 'Seed-based correlation analysis', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dTcorr1D.html' },
      { name: '3dTcorrMap', fullName: 'AFNI 3D Temporal Correlation Map', function: 'Computes various whole-brain correlation metrics', typicalUse: 'Global connectivity metrics, data exploration', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dTcorrMap.html' },
      { name: '3dRSFC', fullName: 'AFNI 3D Resting State fMRI Connectivity', function: 'Computes resting-state metrics (ALFF, fALFF, RSFA, etc.)', typicalUse: 'Amplitude of low-frequency fluctuations analysis', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dRSFC.html' }
    ],
    'ROI/Parcellation': [
      { name: '3dROIstats', fullName: 'AFNI 3D ROI Statistics', function: 'Extracts statistics from data within ROI masks', typicalUse: 'Extracting mean values from regions', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dROIstats.html' },
      { name: '3dmaskave', fullName: 'AFNI 3D Mask Average', function: 'Outputs average time series from masked region', typicalUse: 'Simple ROI time series extraction', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dmaskave.html' },
      { name: '3dUndump', fullName: 'AFNI 3D Undump', function: 'Creates dataset from coordinate text file', typicalUse: 'Creating spherical ROIs from peak coordinates', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dUndump.html' },
      { name: 'whereami', fullName: 'AFNI Whereami Atlas Query', function: 'Reports atlas labels for coordinates', typicalUse: 'Identifying anatomical locations of activations', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/whereami.html' },
      { name: '3dresample', fullName: 'AFNI 3D Resample', function: 'Resamples dataset to different grid', typicalUse: 'Matching resolution between datasets', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dresample.html' },
      { name: '3dfractionize', fullName: 'AFNI 3D Fractionize', function: 'Resamples ROI/atlas with fractional weighting', typicalUse: 'Resampling parcellations to functional resolution', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dfractionize.html' }
    ],
    'Utilities': [
      { name: '3dcalc', fullName: 'AFNI 3D Calculator', function: 'Voxelwise calculator with extensive expression support', typicalUse: 'Mathematical operations, masking, thresholding', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dcalc.html' },
      { name: '3dinfo', fullName: 'AFNI 3D Info', function: 'Displays header information from datasets', typicalUse: 'QC, scripting decisions based on data properties', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dinfo.html' },
      { name: '3dTstat', fullName: 'AFNI 3D Temporal Statistics', function: 'Computes temporal statistics (mean, stdev, etc.)', typicalUse: 'Creating mean functional images, variance maps', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dTstat.html' },
      { name: '3dcopy', fullName: 'AFNI 3D Copy', function: 'Copies dataset with optional format conversion', typicalUse: 'Format conversion, making editable copies', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dcopy.html' },
      { name: '3dZeropad', fullName: 'AFNI 3D Zeropad', function: 'Adds zero-padding around dataset boundaries', typicalUse: 'Matching matrix sizes, preventing edge effects', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dZeropad.html' },
      { name: '3dNwarpApply', fullName: 'AFNI 3D Nonlinear Warp Apply', function: 'Applies nonlinear warps to datasets', typicalUse: 'Applying 3dQwarp transformations', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dNwarpApply.html' },
      { name: '3dNwarpCat', fullName: 'AFNI 3D Nonlinear Warp Concatenate', function: 'Concatenates multiple warps into one', typicalUse: 'Combining transformations efficiently', docUrl: 'https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dNwarpCat.html' }
    ]
  },

  SPM: {},

  FreeSurfer: {
    'Surface Reconstruction': [
      { name: 'mri_convert', fullName: 'FreeSurfer MRI Convert', function: 'Format conversion between neuroimaging formats', typicalUse: 'Converting DICOM to NIfTI, conforming to FreeSurfer standards', docUrl: 'https://surfer.nmr.mgh.harvard.edu/fswiki/mri_convert' },
      { name: 'mri_watershed', fullName: 'FreeSurfer MRI Watershed', function: 'Skull stripping using watershed algorithm', typicalUse: 'Brain extraction within recon-all', docUrl: 'https://surfer.nmr.mgh.harvard.edu/fswiki/mri_watershed' },
      { name: 'mri_normalize', fullName: 'FreeSurfer MRI Normalize', function: 'Intensity normalization for T1 images', typicalUse: 'Preparing T1 for segmentation', docUrl: 'https://surfer.nmr.mgh.harvard.edu/fswiki/mri_normalize' },
      { name: 'mri_segment', fullName: 'FreeSurfer MRI Segment', function: 'White matter segmentation', typicalUse: 'WM identification for surface reconstruction', docUrl: 'https://surfer.nmr.mgh.harvard.edu/fswiki/mri_segment' },
      { name: 'mris_inflate', fullName: 'FreeSurfer Surface Inflate', function: 'Inflates cortical surface for visualization', typicalUse: 'Creating inflated surfaces for visualization', docUrl: 'https://surfer.nmr.mgh.harvard.edu/fswiki/mris_inflate' },
      { name: 'mris_sphere', fullName: 'FreeSurfer Surface to Sphere', function: 'Maps surface to sphere for registration', typicalUse: 'Preparing for spherical registration', docUrl: 'https://surfer.nmr.mgh.harvard.edu/fswiki/mris_sphere' }
    ],
    'Parcellation': [
      { name: 'mri_aparc2aseg', fullName: 'FreeSurfer Aparc to Aseg', function: 'Combines cortical parcellation with subcortical segmentation', typicalUse: 'Creating volumetric parcellation from surface labels', docUrl: 'https://surfer.nmr.mgh.harvard.edu/fswiki/mri_aparc2aseg' },
      { name: 'mri_annotation2label', fullName: 'FreeSurfer Annotation to Label', function: 'Converts surface annotation to individual label files', typicalUse: 'Extracting individual ROIs from parcellation', docUrl: 'https://surfer.nmr.mgh.harvard.edu/fswiki/mri_annotation2label' },
      { name: 'mris_ca_label', fullName: 'FreeSurfer Cortical Atlas Label', function: 'Automatic cortical labeling based on atlas', typicalUse: 'Applying parcellation atlas to individual', docUrl: 'https://surfer.nmr.mgh.harvard.edu/fswiki/mris_ca_label' },
      { name: 'mri_label2vol', fullName: 'FreeSurfer Label to Volume', function: 'Converts surface labels to volume space', typicalUse: 'Creating volumetric ROIs from surface ROIs', docUrl: 'https://surfer.nmr.mgh.harvard.edu/fswiki/mri_label2vol' }
    ],
    'Functional': [
      { name: 'bbregister', fullName: 'FreeSurfer Boundary-Based Registration', function: 'Boundary-based registration of EPI to FreeSurfer anatomy', typicalUse: 'High-quality EPI to T1 registration using surfaces', docUrl: 'https://surfer.nmr.mgh.harvard.edu/fswiki/bbregister' },
      { name: 'mri_vol2surf', fullName: 'FreeSurfer Volume to Surface', function: 'Projects volume data onto cortical surface', typicalUse: 'Mapping functional data to surface for analysis', docUrl: 'https://surfer.nmr.mgh.harvard.edu/fswiki/mri_vol2surf' },
      { name: 'mri_surf2vol', fullName: 'FreeSurfer Surface to Volume', function: 'Projects surface data back to volume', typicalUse: 'Converting surface results to volume space', docUrl: 'https://surfer.nmr.mgh.harvard.edu/fswiki/mri_surf2vol' },
      { name: 'mris_preproc', fullName: 'FreeSurfer Surface Preprocessing', function: 'Prepares surface data for group analysis', typicalUse: 'Concatenating subjects for surface group analysis', docUrl: 'https://surfer.nmr.mgh.harvard.edu/fswiki/mris_preproc' },
      { name: 'mri_glmfit', fullName: 'FreeSurfer General Linear Model Fit', function: 'General linear model on surface or volume data', typicalUse: 'Surface-based group analysis', docUrl: 'https://surfer.nmr.mgh.harvard.edu/fswiki/mri_glmfit' }
    ],
    'Morphometry': [
      { name: 'mris_anatomical_stats', fullName: 'FreeSurfer Surface Anatomical Statistics', function: 'Computes surface-based morphometric measures', typicalUse: 'Extracting thickness, area, volume per region', docUrl: 'https://surfer.nmr.mgh.harvard.edu/fswiki/mris_anatomical_stats' },
      { name: 'mri_segstats', fullName: 'FreeSurfer Segmentation Statistics', function: 'Computes statistics from segmentation', typicalUse: 'Extracting volumes, mean intensities per structure', docUrl: 'https://surfer.nmr.mgh.harvard.edu/fswiki/mri_segstats' },
      { name: 'aparcstats2table', fullName: 'FreeSurfer Aparc Stats to Table', function: 'Collects parcellation stats across subjects into table', typicalUse: 'Creating group spreadsheet for statistical analysis', docUrl: 'https://surfer.nmr.mgh.harvard.edu/fswiki/aparcstats2table' },
      { name: 'asegstats2table', fullName: 'FreeSurfer Aseg Stats to Table', function: 'Collects subcortical stats across subjects into table', typicalUse: 'Group analysis of subcortical volumes', docUrl: 'https://surfer.nmr.mgh.harvard.edu/fswiki/asegstats2table' }
    ],
    'Diffusion': [
      { name: 'dmri_postreg', fullName: 'FreeSurfer dMRI Post-Registration', function: 'Post-registration processing for diffusion', typicalUse: 'Part of TRACULA pipeline', docUrl: 'https://surfer.nmr.mgh.harvard.edu/fswiki/dmri_postreg' }
    ]
  },

  ANTs: {
    'Registration': [
      { name: 'antsRegistration', fullName: 'ANTs Registration', function: 'Comprehensive image registration with multiple stages', typicalUse: 'High-quality registration with full control', docUrl: 'https://github.com/ANTsX/ANTs/wiki/Anatomy-of-an-antsRegistration-call' },
      { name: 'antsRegistrationSyN.sh', fullName: 'ANTs Symmetric Normalization Registration', function: 'Symmetric normalization with sensible defaults', typicalUse: 'Standard registration with good defaults', docUrl: 'https://github.com/ANTsX/ANTs/wiki/Anatomy-of-an-antsRegistration-call' },
      { name: 'antsRegistrationSyNQuick.sh', fullName: 'ANTs Quick Symmetric Normalization', function: 'Fast SyN registration with reduced parameters', typicalUse: 'Quick registration when speed is priority', docUrl: 'https://github.com/ANTsX/ANTs/wiki/Anatomy-of-an-antsRegistration-call' },
      { name: 'antsApplyTransforms', fullName: 'ANTs Apply Transforms', function: 'Applies transformations to images', typicalUse: 'Applying registration to data or labels', docUrl: 'https://github.com/ANTsX/ANTs/wiki/Anatomy-of-an-antsRegistration-call' },
      { name: 'antsMotionCorr', fullName: 'ANTs Motion Correction', function: 'Motion correction using ANTs registration', typicalUse: 'High-quality motion correction', docUrl: 'https://github.com/ANTsX/ANTs/wiki/antsMotionCorr' },
      { name: 'antsIntermodalityIntrasubject.sh', fullName: 'ANTs Intermodality Intrasubject Registration', function: 'Registration between modalities within subject', typicalUse: 'T1-to-T2, fMRI-to-T1 alignment', docUrl: 'https://github.com/ANTsX/ANTs/wiki/Anatomy-of-an-antsRegistration-call' }
    ],
    'Segmentation': [
      { name: 'Atropos', fullName: 'ANTs Atropos Segmentation', function: 'Probabilistic tissue segmentation using EM algorithm', typicalUse: 'GMM-based brain tissue segmentation', docUrl: 'https://github.com/ANTsX/ANTs/wiki/Atropos-and-N4' },
      { name: 'antsAtroposN4.sh', fullName: 'ANTs Atropos with N4 Bias Correction', function: 'Combined bias correction and segmentation', typicalUse: 'Iterative N4 + segmentation for better results', docUrl: 'https://github.com/ANTsX/ANTs/wiki/Atropos-and-N4' },
      { name: 'antsBrainExtraction.sh', fullName: 'ANTs Brain Extraction', function: 'Brain extraction using registration and templates', typicalUse: 'High-quality skull stripping', docUrl: 'https://github.com/ANTsX/ANTs/wiki/antsBrainExtraction-and-templates' },
      { name: 'antsCorticalThickness.sh', fullName: 'ANTs Cortical Thickness Pipeline', function: 'Complete cortical thickness estimation pipeline', typicalUse: 'DiReCT-based cortical thickness measurement', docUrl: 'https://github.com/ANTsX/ANTs/wiki/antsCorticalThickness-and-Templates' },
      { name: 'KellyKapowski', fullName: 'DiReCT (Diffeomorphic Registration-based Cortical Thickness)', function: 'Diffeomorphic Registration-based Cortical Thickness', typicalUse: 'Computing cortical thickness from segmentation', docUrl: 'https://github.com/ANTsX/ANTs/wiki/antsCorticalThickness-and-Templates' }
    ],
    'Utilities': [
      { name: 'N4BiasFieldCorrection', fullName: 'ANTs N4 Bias Field Correction', function: 'Advanced bias field correction using N4 algorithm', typicalUse: 'Removing intensity inhomogeneity', docUrl: 'https://github.com/ANTsX/ANTs/wiki/Atropos-and-N4' },
      { name: 'DenoiseImage', fullName: 'ANTs Denoise Image', function: 'Non-local means denoising', typicalUse: 'Noise reduction while preserving edges', docUrl: 'https://github.com/ANTsX/ANTs/wiki/DenoiseImage' },
      { name: 'ImageMath', fullName: 'ANTs Image Math', function: 'Various image operations and measurements', typicalUse: 'Mathematical operations, morphological operations', docUrl: 'https://github.com/ANTsX/ANTs/wiki/ImageMath' },
      { name: 'ThresholdImage', fullName: 'ANTs Threshold Image', function: 'Thresholding with various methods', typicalUse: 'Creating binary masks, Otsu thresholding', docUrl: 'https://github.com/ANTsX/ANTs/wiki' },
      { name: 'LabelGeometryMeasures', fullName: 'ANTs Label Geometry Measures', function: 'Computes geometric measures for labeled regions', typicalUse: 'Volume, centroid, and shape measures per label', docUrl: 'https://github.com/ANTsX/ANTs/wiki' },
      { name: 'antsJointLabelFusion.sh', fullName: 'ANTs Joint Label Fusion', function: 'Multi-atlas segmentation with joint label fusion', typicalUse: 'High-accuracy segmentation using multiple atlases', docUrl: 'https://github.com/ANTsX/ANTs/wiki/antsJointLabelFusion' }
    ]
  }
};

export const libraryOrder = ['FSL', 'AFNI', 'SPM', 'FreeSurfer', 'ANTs'];
