#!/usr/bin/env python3
"""Generate synthetic dMRI test data for CWL tool testing."""

import sys
import os
import numpy as np

try:
    import nibabel as nib
except ImportError:
    print("ERROR: nibabel required. Install with: pip3 install nibabel")
    sys.exit(1)

data_dir = sys.argv[1]
os.makedirs(data_dir, exist_ok=True)

# Image parameters
nx, ny, nz = 32, 32, 16
n_b0 = 1
n_dwi = 32
n_volumes = n_b0 + n_dwi
voxel_size = 2.0

# Affine matrix
affine = np.eye(4) * voxel_size
affine[3, 3] = 1.0

# Brain mask (sphere)
x, y, z = np.ogrid[0:nx, 0:ny, 0:nz]
cx, cy, cz = nx // 2, ny // 2, nz // 2
radius = min(nx, ny, nz) // 3
mask = ((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2) <= radius ** 2
mask = mask.astype(np.uint8)
nib.save(nib.Nifti1Image(mask, affine), os.path.join(data_dir, "mask.nii.gz"))
print(f"Created mask.nii.gz: shape={mask.shape}")

# Gradient directions (golden angle spiral)
golden_angle = np.pi * (3 - np.sqrt(5))
theta = np.arange(n_dwi) * golden_angle
phi = np.arccos(1 - 2 * (np.arange(n_dwi) + 0.5) / n_dwi)
bvecs_x = np.sin(phi) * np.cos(theta)
bvecs_y = np.sin(phi) * np.sin(theta)
bvecs_z = np.cos(phi)

# Simulate DWI with prolate tensor along z
b0_signal = 1000.0
b_value = 1000.0
D = np.array([0.3e-3, 0.3e-3, 1.7e-3])

dwi_data = np.zeros((nx, ny, nz, n_volumes), dtype=np.float32)
dwi_data[:, :, :, 0] = b0_signal * mask

for i in range(n_dwi):
    g = np.array([bvecs_x[i], bvecs_y[i], bvecs_z[i]])
    adc = np.sum(g ** 2 * D)
    signal = b0_signal * np.exp(-b_value * adc)
    noise = np.random.normal(0, 20, (nx, ny, nz)).astype(np.float32)
    dwi_data[:, :, :, i + 1] = signal * mask + noise * mask

nib.save(nib.Nifti1Image(dwi_data, affine), os.path.join(data_dir, "dwi.nii.gz"))
print(f"Created dwi.nii.gz: shape={dwi_data.shape}")

# bvals / bvecs
bvals = np.zeros(n_volumes)
bvals[1:] = b_value
np.savetxt(os.path.join(data_dir, "dwi.bval"), bvals.reshape(1, -1), fmt="%d")
print(f"Created dwi.bval: {n_volumes} values")

bvecs = np.zeros((3, n_volumes))
bvecs[0, 1:] = bvecs_x
bvecs[1, 1:] = bvecs_y
bvecs[2, 1:] = bvecs_z
np.savetxt(os.path.join(data_dir, "dwi.bvec"), bvecs, fmt="%.6f")
print(f"Created dwi.bvec: {n_volumes} directions")

# Acquisition params and index for eddy/topup
with open(os.path.join(data_dir, "acqparams.txt"), "w") as f:
    f.write("0 -1 0 0.05\n")
print("Created acqparams.txt")

index_vals = np.ones(n_volumes, dtype=int)
np.savetxt(os.path.join(data_dir, "index.txt"), index_vals.reshape(1, -1), fmt="%d")
print("Created index.txt")

# b0 pair for topup (AP/PA)
b0_pair = np.zeros((nx, ny, nz, 2), dtype=np.float32)
b0_pair[:, :, :, 0] = b0_signal * mask
b0_pair[:, :, :, 1] = b0_signal * mask
b0_pair[1:, :, :, 0] += 50 * mask[:-1, :, :]
b0_pair[:-1, :, :, 1] += 50 * mask[1:, :, :]
nib.save(nib.Nifti1Image(b0_pair, affine), os.path.join(data_dir, "b0_pair.nii.gz"))
print(f"Created b0_pair.nii.gz: shape={b0_pair.shape}")

with open(os.path.join(data_dir, "topup_acqparams.txt"), "w") as f:
    f.write("0 -1 0 0.05\n0 1 0 0.05\n")
print("Created topup_acqparams.txt")

# FA images for TBSS
for subj_idx in range(1, 3):
    fa = np.random.uniform(0.1, 0.8, (nx, ny, nz)).astype(np.float32) * mask
    nib.save(nib.Nifti1Image(fa, affine), os.path.join(data_dir, f"fa_sub{subj_idx:02d}.nii.gz"))
    print(f"Created fa_sub{subj_idx:02d}.nii.gz")

# bedpostx directory
bpx_dir = os.path.join(data_dir, "bedpostx_input")
os.makedirs(bpx_dir, exist_ok=True)
nib.save(nib.Nifti1Image(dwi_data, affine), os.path.join(bpx_dir, "data.nii.gz"))
nib.save(nib.Nifti1Image(mask, affine), os.path.join(bpx_dir, "nodif_brain_mask.nii.gz"))
np.savetxt(os.path.join(bpx_dir, "bvals"), bvals.reshape(1, -1), fmt="%d")
np.savetxt(os.path.join(bpx_dir, "bvecs"), bvecs, fmt="%.6f")
print("Created bedpostx_input/ directory")

# MRtrix3 response functions
with open(os.path.join(data_dir, "wm_response.txt"), "w") as f:
    f.write("1000 600 -200 40\n")
print("Created wm_response.txt")

with open(os.path.join(data_dir, "gm_response.txt"), "w") as f:
    f.write("1000 200\n")
print("Created gm_response.txt")

with open(os.path.join(data_dir, "csf_response.txt"), "w") as f:
    f.write("1000 30\n")
print("Created csf_response.txt")

# Parcellation atlas for tck2connectome
parcellation = np.zeros((nx, ny, nz), dtype=np.int16)
parcellation[:nx // 2, :ny // 2, :] = 1
parcellation[nx // 2:, :ny // 2, :] = 2
parcellation[:nx // 2, ny // 2:, :] = 3
parcellation[nx // 2:, ny // 2:, :] = 4
parcellation *= mask.astype(np.int16)
nib.save(nib.Nifti1Image(parcellation, affine), os.path.join(data_dir, "parcellation.nii.gz"))
print(f"Created parcellation.nii.gz: {len(np.unique(parcellation)) - 1} regions")

# FreeSurfer minimal subjects_dir and license
fs_dir = os.path.join(data_dir, "freesurfer_subjects")
os.makedirs(os.path.join(fs_dir, "test_subject", "mri"), exist_ok=True)
nib.save(nib.Nifti1Image(mask, affine), os.path.join(fs_dir, "test_subject", "mri", "brain.mgz"))
with open(os.path.join(data_dir, "fs_license.txt"), "w") as f:
    f.write("dummy@test.com\n00000\n *abcdefg\n 123456789\n")
print("Created freesurfer_subjects/ and fs_license.txt")

# Single b=0 volume for dmri_postreg
b0_vol = dwi_data[:, :, :, 0]
nib.save(nib.Nifti1Image(b0_vol, affine), os.path.join(data_dir, "b0.nii.gz"))
print("Created b0.nii.gz")

print(f"\n=== All test data generated in {data_dir} ===")
