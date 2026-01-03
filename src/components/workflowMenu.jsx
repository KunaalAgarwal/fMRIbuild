import React, { useState } from 'react';
import WorkflowMenuItem from './workflowMenuItem';
import '../styles/workflowMenu.css';

const toolsByLibrary = {
  FSL: [
    // Preprocessing
    'bet', 'fast', 'mcflirt', 'flirt', 'fnirt', 'fugue', 'topup', 'susan',
    'slicetimer', 'fslreorient2std', 'fslsplit', 'fslmerge',
    // Statistical
    'film_gls', 'flameo', 'randomise', 'melodic', 'dual_regression',
    // Diffusion/Structural
    'probtrackx2', 'run_first_all', 'siena', 'sienax', 'fsl_anat',
    // Utilities
    'fslmaths', 'fslstats', 'fslroi', 'fslmeants', 'cluster',
    'applywarp', 'invwarp', 'convertwarp'
  ],
  AFNI: [
    // Preprocessing
    '3dSkullStrip', '3dvolreg', '3dTshift', '3dDespike', '3dBandpass',
    '3dBlurToFWHM', '3dmerge', '3dAllineate', '3dQwarp', '@auto_tlrc',
    '@SSwarper', 'align_epi_anat.py', '3dUnifize', '3dAutomask', '3dTcat',
    // Statistical
    '3dDeconvolve', '3dREMLfit', '3dMEMA', '3dANOVA', '3dANOVA2', '3dANOVA3',
    '3dttest++', '3dMVM', '3dLME', '3dLMEr', '3dClustSim', '3dFWHMx',
    // Connectivity
    '3dNetCorr', '3dTcorr1D', '3dTcorrMap', '3dRSFC',
    // ROI/Parcellation
    '3dROIstats', '3dmaskave', '3dUndump', 'whereami', '3dresample', '3dfractionize',
    // Utilities
    '3dcalc', '3dinfo', '3dTstat', '3dcopy', '3dZeropad', '3dNwarpApply', '3dNwarpCat'
  ],
  SPM: [],
  FreeSurfer: [
    // Surface Reconstruction
    'mri_convert', 'mri_watershed', 'mri_normalize', 'mri_segment',
    'mris_inflate', 'mris_sphere',
    // Parcellation
    'mri_aparc2aseg', 'mri_annotation2label', 'mris_ca_label', 'mri_label2vol',
    // Functional
    'bbregister', 'mri_vol2surf', 'mri_surf2vol', 'mris_preproc', 'mri_glmfit',
    // Morphometry
    'mris_anatomical_stats', 'mri_segstats', 'aparcstats2table', 'asegstats2table',
    // Diffusion
    'dmri_postreg'
  ],
  ANTs: [
    // Registration
    'antsRegistration', 'antsRegistrationSyN.sh', 'antsRegistrationSyNQuick.sh',
    'antsApplyTransforms', 'antsMotionCorr', 'antsIntermodalityIntrasubject.sh',
    // Segmentation
    'Atropos', 'antsAtroposN4.sh', 'antsBrainExtraction.sh',
    'antsCorticalThickness.sh', 'KellyKapowski',
    // Utilities
    'N4BiasFieldCorrection', 'DenoiseImage', 'ImageMath', 'ThresholdImage',
    'LabelGeometryMeasures', 'antsJointLabelFusion.sh'
  ]
};

const libraryOrder = ['FSL', 'AFNI', 'SPM', 'FreeSurfer', 'ANTs'];

function WorkflowMenu() {
  const [expandedSections, setExpandedSections] = useState({
    FSL: false,
    AFNI: false,
    SPM: false,
    FreeSurfer: false,
    ANTs: false
  });

  const toggleSection = (library) => {
    setExpandedSections(prev => ({
      ...prev,
      [library]: !prev[library]
    }));
  };

  const handleDragStart = (event, name) => {
    event.dataTransfer.setData('node/name', name);
  };

  return (
    <div className="workflow-menu-container">
      <div className="workflow-menu">
        {libraryOrder.map((library) => {
          const tools = toolsByLibrary[library];
          const isExpanded = expandedSections[library];
          const toolCount = tools.length;

          return (
            <div key={library} className="library-section">
              <div
                className={`library-header ${isExpanded ? 'expanded' : ''}`}
                onClick={() => toggleSection(library)}
              >
                <span className="chevron">{isExpanded ? '▼' : '▶'}</span>
                <span className="library-name">{library}</span>
                <span className="tool-count">
                  {toolCount > 0 ? `${toolCount}` : ''}
                </span>
              </div>

              {isExpanded && (
                <div className="library-tools">
                  {toolCount === 0 ? (
                    <div className="coming-soon">Coming Soon - requires MATLAB</div>
                  ) : (
                    tools.map((tool, index) => (
                      <WorkflowMenuItem
                        key={`${library}-${index}`}
                        name={tool}
                        onDragStart={handleDragStart}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WorkflowMenu;
