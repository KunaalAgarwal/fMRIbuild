#!/usr/bin/env node
/**
 * Fetches Docker image tags from Docker Hub for neuroimaging libraries.
 * Run with: node scripts/fetchDockerTags.js
 *
 * This script queries the Docker Hub API and outputs the tags that should
 * be added to src/data/toolData.js
 */

const https = require('https');

// Docker images to fetch tags for (from toolMap.js)
const DOCKER_IMAGES = {
    FSL: 'brainlife/fsl',
    AFNI: 'brainlife/afni',
    ANTs: 'antsx/ants',
    FreeSurfer: 'freesurfer/freesurfer',
    MRtrix3: 'mrtrix3/mrtrix3',
    fMRIPrep: 'nipreps/fmriprep',
    MRIQC: 'nipreps/mriqc'
};

// Maximum number of tags to keep per image
const MAX_TAGS = 15;

/**
 * Fetches tags for a Docker image from Docker Hub API
 * @param {string} image - Full image name (e.g., 'brainlife/fsl')
 * @returns {Promise<string[]>} Array of tag names
 */
function fetchTags(image) {
    return new Promise((resolve, reject) => {
        const url = `https://hub.docker.com/v2/repositories/${image}/tags?page_size=100&ordering=last_updated`;

        https.get(url, (res) => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.results) {
                        const tags = json.results
                            .map(t => t.name)
                            .filter(name => {
                                // Filter out SHA-based tags and keep meaningful version tags
                                if (name.match(/^[a-f0-9]{7,}$/)) return false;
                                if (name.includes('sha-')) return false;
                                return true;
                            });

                        // Ensure 'latest' is first if it exists
                        const latestIndex = tags.indexOf('latest');
                        if (latestIndex > 0) {
                            tags.splice(latestIndex, 1);
                            tags.unshift('latest');
                        } else if (latestIndex === -1) {
                            // Add 'latest' if not present (as fallback)
                            tags.unshift('latest');
                        }

                        resolve(tags.slice(0, MAX_TAGS));
                    } else {
                        reject(new Error(`No results for ${image}: ${json.message || 'Unknown error'}`));
                    }
                } catch (err) {
                    reject(new Error(`Failed to parse response for ${image}: ${err.message}`));
                }
            });
        }).on('error', reject);
    });
}

/**
 * Main function to fetch all tags and output the result
 */
async function main() {
    console.log('Fetching Docker tags from Docker Hub...\n');

    const results = {};
    const errors = [];

    for (const [library, image] of Object.entries(DOCKER_IMAGES)) {
        process.stdout.write(`Fetching ${library} (${image})... `);
        try {
            const tags = await fetchTags(image);
            results[library] = tags;
            console.log(`OK (${tags.length} tags)`);
        } catch (err) {
            errors.push({ library, error: err.message });
            console.log(`FAILED: ${err.message}`);
        }
    }

    console.log('\n' + '='.repeat(60) + '\n');

    if (Object.keys(results).length > 0) {
        console.log('Add this to src/data/toolData.js:\n');
        console.log('export const DOCKER_TAGS = {');

        for (const [library, tags] of Object.entries(results)) {
            const image = DOCKER_IMAGES[library];
            console.log(`    // ${image} - https://hub.docker.com/r/${image}/tags`);
            console.log(`    ${library}: ${JSON.stringify(tags)},`);
            console.log('');
        }

        console.log('};');
    }

    if (errors.length > 0) {
        console.log('\n' + '='.repeat(60));
        console.log('Errors encountered:');
        errors.forEach(e => console.log(`  - ${e.library}: ${e.error}`));
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Fetched: ${new Date().toISOString()}`);
}

main().catch(console.error);
