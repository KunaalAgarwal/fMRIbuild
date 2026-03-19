/**
 * Export tool annotations, modality assignments, Docker images/tags,
 * and parsed CWL data to a single JSON file for documentation generation.
 *
 * Usage: node scripts/exportAnnotations.mjs > tool-data.json
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const jsYaml = require('js-yaml');
const parseYaml = jsYaml.load;

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// --- Extract exports from toolAnnotations.js by wrapping in a Function ---
const annotationsPath = join(projectRoot, 'src', 'utils', 'toolAnnotations.js');
const annotationsSource = readFileSync(annotationsPath, 'utf-8');

// Strip ES module syntax and Vite-specific code, then evaluate
const wrapped = annotationsSource
    // Remove all export keywords
    .replace(/^export\s+const\s+/gm, 'const ')
    .replace(/^export\s+/gm, '')
    // Remove all import statements
    .replace(/^import\s+.*$/gm, '')
    // Replace import.meta.env references with false
    .replace(/import\.meta\.env\.\w+/g, 'false');

// Build a function that returns all the constants we need
const extractFn = new Function(wrapped + `
    return {
        TOOL_ANNOTATIONS,
        DOCKER_IMAGES,
        DOCKER_TAGS,
        MODALITY_ASSIGNMENTS,
        modalityOrder,
        modalityDescriptions,
    };
`);

const {
    TOOL_ANNOTATIONS, DOCKER_IMAGES, DOCKER_TAGS,
    MODALITY_ASSIGNMENTS, modalityOrder, modalityDescriptions,
} = extractFn();

// --- Parse all CWL files ---
const cwlDir = join(projectRoot, 'public', 'cwl');
const cwlData = {};

function findCwlFiles(dir) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
            findCwlFiles(fullPath);
        } else if (entry.endsWith('.cwl')) {
            const relPath = 'cwl/' + relative(cwlDir, fullPath).replace(/\\/g, '/');
            try {
                const content = readFileSync(fullPath, 'utf-8');
                const parsed = parseYaml(content);
                cwlData[relPath] = parseCwl(parsed);
            } catch (e) {
                console.error(`Warning: failed to parse ${relPath}: ${e.message}`);
            }
        }
    }
}

function parseCwl(cwl) {
    const result = {
        baseCommand: cwl.baseCommand || null,
        dockerPull: cwl.hints?.DockerRequirement?.dockerPull
            || cwl.requirements?.DockerRequirement?.dockerPull
            || null,
        inputs: {},
        outputs: {},
    };

    if (cwl.inputs) {
        for (const [name, def] of Object.entries(cwl.inputs)) {
            const inputDef = typeof def === 'string' ? { type: def } : def;
            result.inputs[name] = {
                type: formatType(inputDef.type),
                label: inputDef.label || null,
                prefix: inputDef.inputBinding?.prefix || null,
                position: inputDef.inputBinding?.position || null,
                default: inputDef.default !== undefined ? inputDef.default : undefined,
                required: !isNullable(inputDef.type),
            };
        }
    }

    if (cwl.outputs) {
        for (const [name, def] of Object.entries(cwl.outputs)) {
            const outputDef = typeof def === 'string' ? { type: def } : def;
            result.outputs[name] = {
                type: formatType(outputDef.type),
                label: outputDef.label || null,
                glob: outputDef.outputBinding?.glob || null,
            };
        }
    }

    return result;
}

function isNullable(type) {
    if (Array.isArray(type)) return type.includes('null');
    if (typeof type === 'string') return type.endsWith('?');
    return false;
}

function formatType(type) {
    if (type == null) return 'any';
    if (typeof type === 'string') return type;
    if (Array.isArray(type)) {
        const nonNull = type.filter(t => t !== 'null');
        if (nonNull.length === 1) return formatType(nonNull[0]);
        return nonNull.map(t => formatType(t)).join(' | ');
    }
    if (typeof type === 'object') {
        if (type.type === 'array') return formatType(type.items) + '[]';
        if (type.type === 'enum') return 'enum';
        if (type.type === 'record') return `record(${type.name || 'unnamed'})`;
        return JSON.stringify(type);
    }
    return String(type);
}

function buildToolLocations() {
    const locations = {};
    for (const [modality, libraries] of Object.entries(MODALITY_ASSIGNMENTS)) {
        for (const [library, categories] of Object.entries(libraries)) {
            for (const [category, tools] of Object.entries(categories)) {
                for (const tool of tools) {
                    if (!locations[tool]) locations[tool] = [];
                    locations[tool].push({ modality, library, category });
                }
            }
        }
    }
    return locations;
}

findCwlFiles(cwlDir);
const toolLocations = buildToolLocations();

const output = {
    tools: {},
    modalityAssignments: MODALITY_ASSIGNMENTS,
    modalityOrder,
    modalityDescriptions,
    dockerImages: DOCKER_IMAGES,
    dockerTags: DOCKER_TAGS,
};

for (const [toolName, annotation] of Object.entries(TOOL_ANNOTATIONS)) {
    const cwl = annotation.cwlPath ? cwlData[annotation.cwlPath] || null : null;
    output.tools[toolName] = {
        name: toolName,
        ...annotation,
        cwl,
        locations: toolLocations[toolName] || [],
    };
}

console.log(JSON.stringify(output, null, 2));
