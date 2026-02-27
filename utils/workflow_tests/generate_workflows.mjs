#!/usr/bin/env node
/**
 * Generate CWL workflow files from fixture graph definitions.
 *
 * This script imports niBuild's production buildCWLWorkflowObject() function,
 * feeds it canonical workflow graph fixtures, and writes the generated CWL
 * to utils/workflow_tests/generated/ for validation by cwltool.
 *
 * Usage: node utils/workflow_tests/generate_workflows.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'js-yaml';

import { TOOL_ANNOTATIONS } from '../../src/utils/toolAnnotations.js';
import { _parseCWLDocumentForTest, _injectParsedForTest } from '../../src/utils/cwlParser.js';
import { invalidateMergeCache } from '../../src/utils/toolRegistry.js';
import { buildCWLWorkflowObject, buildJobTemplate } from '../../src/hooks/buildWorkflow.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const PUBLIC_CWL_DIR = path.join(ROOT_DIR, 'public', 'cwl');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const GENERATED_DIR = path.join(__dirname, 'generated');

// ── Load CWL tool files from disk and inject into the parser cache ──

function loadToolCWL(cwlPath) {
    const fullPath = path.join(ROOT_DIR, 'public', cwlPath);
    if (!fs.existsSync(fullPath)) {
        console.warn(`  WARN: CWL file not found: ${fullPath}`);
        return null;
    }
    const text = fs.readFileSync(fullPath, 'utf8');
    const doc = YAML.load(text);
    const parsed = _parseCWLDocumentForTest(doc, cwlPath);
    _injectParsedForTest(cwlPath, parsed);
    return parsed;
}

/**
 * Discover which tools are needed by scanning fixture nodes, then load them.
 */
function loadToolsForFixtures(fixtures) {
    const toolLabels = new Set();

    for (const fixture of fixtures) {
        for (const node of fixture.nodes) {
            toolLabels.add(node.data.label);
        }
    }

    console.log(`  Tools needed: ${[...toolLabels].join(', ')}`);

    for (const label of toolLabels) {
        const annotation = TOOL_ANNOTATIONS[label];
        if (!annotation?.cwlPath) {
            console.warn(`  WARN: No annotation/cwlPath for tool "${label}"`);
            continue;
        }
        const result = loadToolCWL(annotation.cwlPath);
        if (result) {
            console.log(`  Loaded: ${annotation.cwlPath}`);
        }
    }

    // Force tool registry to re-merge with freshly populated cache
    invalidateMergeCache();
}

/**
 * Rewrite step.run paths to absolute paths for cwltool validation.
 * The generated CWL has relative paths like ../cwl/fsl/bet.cwl which
 * won't resolve correctly from the generated/ directory.
 */
function rewriteRunPaths(wfObj) {
    if (!wfObj.steps) return;
    for (const step of Object.values(wfObj.steps)) {
        if (step.run && typeof step.run === 'string') {
            // step.run is like "../cwl/fsl/bet.cwl" — strip leading ../
            const cwlRelPath = step.run.replace(/^\.\.\//, '');
            // Convert to absolute path using forward slashes (CWL standard)
            const absPath = path.join(PUBLIC_CWL_DIR, '..', cwlRelPath).replace(/\\/g, '/');
            step.run = absPath;
        }
    }
}

// ── Main ──

async function main() {
    console.log('=== Generating CWL Workflows from Fixtures ===');
    console.log(`  Fixtures: ${FIXTURES_DIR}`);
    console.log(`  Output:   ${GENERATED_DIR}`);
    console.log('');

    // Ensure output directory exists
    fs.mkdirSync(GENERATED_DIR, { recursive: true });

    // Read all fixture files
    const fixtureFiles = fs.readdirSync(FIXTURES_DIR)
        .filter(f => f.endsWith('.json'))
        .sort();

    if (fixtureFiles.length === 0) {
        console.error('ERROR: No fixture files found');
        process.exit(1);
    }

    const fixtures = fixtureFiles.map(f => {
        const text = fs.readFileSync(path.join(FIXTURES_DIR, f), 'utf8');
        return JSON.parse(text);
    });

    console.log(`  Found ${fixtures.length} fixtures: ${fixtureFiles.join(', ')}`);
    console.log('');

    // Load all tool CWL files needed by fixtures
    console.log('── Loading tool CWL files ──');
    loadToolsForFixtures(fixtures);
    console.log('');

    // Generate CWL for each fixture
    let passed = 0;
    let failed = 0;

    for (const fixture of fixtures) {
        const name = fixture.name;
        console.log(`── Generating: ${name} ──`);
        console.log(`  Description: ${fixture.description}`);
        console.log(`  Nodes: ${fixture.nodes.length}, Edges: ${fixture.edges.length}`);

        try {
            const graph = { nodes: fixture.nodes, edges: fixture.edges };
            const { wf, jobDefaults, cwlDefaultKeys } = buildCWLWorkflowObject(graph);

            // Rewrite run paths to absolute for validation
            rewriteRunPaths(wf);

            // Serialize to YAML
            const cwlYaml = '#!/usr/bin/env cwl-runner\n\n' +
                YAML.dump(wf, {
                    noRefs: true,
                    lineWidth: -1,
                    quotingType: '"',
                    forceQuotes: false,
                });

            // Write CWL file
            const cwlPath = path.join(GENERATED_DIR, `${name}.cwl`);
            fs.writeFileSync(cwlPath, cwlYaml, 'utf8');
            console.log(`  Written: ${cwlPath}`);

            // Also generate job template
            const jobYaml = buildJobTemplate(wf, jobDefaults, cwlDefaultKeys);
            const jobPath = path.join(GENERATED_DIR, `${name}_job.yml`);
            fs.writeFileSync(jobPath, jobYaml, 'utf8');
            console.log(`  Job template: ${jobPath}`);

            // Basic structural checks
            const stepCount = Object.keys(wf.steps).length;
            const inputCount = Object.keys(wf.inputs).length;
            const outputCount = Object.keys(wf.outputs).length;
            console.log(`  Steps: ${stepCount}, Inputs: ${inputCount}, Outputs: ${outputCount}`);

            if (stepCount === 0) {
                console.log(`  ERROR: No steps generated`);
                failed++;
            } else {
                console.log(`  OK`);
                passed++;
            }
        } catch (err) {
            console.log(`  ERROR: ${err.message}`);
            failed++;
        }
        console.log('');
    }

    console.log(`── Generation Summary ──`);
    console.log(`  Generated: ${passed}, Failed: ${failed}`);

    if (failed > 0) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
