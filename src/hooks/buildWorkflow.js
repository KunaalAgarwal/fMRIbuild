import YAML from 'js-yaml';
import { getToolConfigSync } from '../utils/toolRegistry.js';
import { computeScatteredNodes } from '../utils/scatterPropagation.js';

/**
 * Expand custom workflow nodes into their internal nodes/edges.
 * Rewrites external edges so their namespaced mappings (internalNodeId/ioName)
 * point to the correct expanded internal node with plain ioName.
 * Returns a flat graph with no custom workflow nodes.
 */
function expandCustomWorkflowNodes(graph) {
    const { nodes, edges } = graph;
    const customNodes = nodes.filter(n => n.data?.isCustomWorkflow);

    if (customNodes.length === 0) return graph;

    const customNodeIds = new Set(customNodes.map(n => n.id));
    const expandedNodes = [];
    const expandedEdges = [];

    // 1. Expand each custom workflow node into its internal nodes + edges
    for (const customNode of customNodes) {
        const { internalNodes = [], internalEdges = [] } = customNode.data;

        for (const iNode of internalNodes) {
            expandedNodes.push({
                id: `${customNode.id}__${iNode.id}`,
                type: 'default',
                data: {
                    label: iNode.label,
                    isDummy: iNode.isDummy || false,
                    parameters: iNode.parameters || {},
                    dockerVersion: iNode.dockerVersion || 'latest',
                    scatterEnabled: iNode.scatterEnabled || false,
                    gatherEnabled: iNode.gatherEnabled || false,
                    linkMergeOverrides: iNode.linkMergeOverrides || {},
                    whenExpression: iNode.whenExpression || '',
                    expressions: iNode.expressions || {},
                },
                position: iNode.position || { x: 0, y: 0 },
            });
        }

        for (const iEdge of internalEdges) {
            expandedEdges.push({
                id: `${customNode.id}__${iEdge.id}`,
                source: `${customNode.id}__${iEdge.source}`,
                target: `${customNode.id}__${iEdge.target}`,
                data: iEdge.data ? structuredClone(iEdge.data) : {},
            });
        }
    }

    // 2. Keep non-custom nodes as-is
    const regularNodes = nodes.filter(n => !customNodeIds.has(n.id));

    // 3. Rewrite external edges that touch custom workflow nodes
    const rewrittenEdges = [];

    for (const edge of edges) {
        const srcIsCustom = customNodeIds.has(edge.source);
        const tgtIsCustom = customNodeIds.has(edge.target);

        if (!srcIsCustom && !tgtIsCustom) {
            rewrittenEdges.push(edge);
            continue;
        }

        const mappings = edge.data?.mappings || [];

        // Group mappings by (expandedSource, expandedTarget) pair
        // since one external edge can map to multiple internal nodes
        const edgeGroups = new Map();

        for (const m of mappings) {
            let newSource = edge.source;
            let newSourceOutput = m.sourceOutput;
            let newTarget = edge.target;
            let newTargetInput = m.targetInput;

            if (srcIsCustom) {
                const slashIdx = m.sourceOutput.indexOf('/');
                if (slashIdx > -1) {
                    const internalNodeId = m.sourceOutput.substring(0, slashIdx);
                    newSourceOutput = m.sourceOutput.substring(slashIdx + 1);
                    newSource = `${edge.source}__${internalNodeId}`;
                }
            }

            if (tgtIsCustom) {
                const slashIdx = m.targetInput.indexOf('/');
                if (slashIdx > -1) {
                    const internalNodeId = m.targetInput.substring(0, slashIdx);
                    newTargetInput = m.targetInput.substring(slashIdx + 1);
                    newTarget = `${edge.target}__${internalNodeId}`;
                }
            }

            const key = `${newSource}::${newTarget}`;
            if (!edgeGroups.has(key)) {
                edgeGroups.set(key, { source: newSource, target: newTarget, mappings: [] });
            }
            edgeGroups.get(key).mappings.push({
                sourceOutput: newSourceOutput,
                targetInput: newTargetInput,
            });
        }

        for (const [key, group] of edgeGroups) {
            rewrittenEdges.push({
                id: `${edge.id}__${key}`,
                source: group.source,
                target: group.target,
                data: { mappings: group.mappings },
            });
        }
    }

    return {
        nodes: [...regularNodes, ...expandedNodes],
        edges: [...rewrittenEdges, ...expandedEdges],
    };
}

/* ========== Pure utility helpers ========== */

/** Convert a type string to its CWL representation. */
function toCWLType(typeStr, makeNullable = false) {
    if (!typeStr) return makeNullable ? ['null', 'File'] : 'File';
    if (typeStr === 'record') return null;
    if (typeStr.endsWith('[]')) {
        const itemType = typeStr.slice(0, -2);
        const arrayType = { type: 'array', items: itemType };
        return makeNullable ? ['null', arrayType] : arrayType;
    }
    if (typeStr.endsWith('?')) {
        return ['null', typeStr.slice(0, -1)];
    }
    return makeNullable ? ['null', typeStr] : typeStr;
}

/** Wrap a type string in a CWL array type. */
function toArrayType(typeStr) {
    const base = (typeStr || 'File').replace(/\?$/, '');
    return { type: 'array', items: base };
}

/** Check if a value is safely YAML-serializable. */
function isSerializable(val) {
    if (val === null || val === undefined) return false;
    const t = typeof val;
    if (t === 'string' || t === 'number' || t === 'boolean') return true;
    if (t === 'function') return false;
    if (Array.isArray(val)) return val.every(isSerializable);
    if (t === 'object') return Object.values(val).every(isSerializable);
    return false;
}

/** Safely extract user parameters object from node data. */
function getUserParams(nodeData) {
    const p = nodeData.parameters;
    if (p && typeof p === 'object' && !Array.isArray(p)) return p;
    return null;
}

/** Return a sensible default value for a CWL type. Prefers CWL-defined defaults. */
function defaultForType(type, inputDef) {
    if (inputDef?.hasDefault) return inputDef.defaultValue;
    switch (type) {
        case 'boolean': return false;
        case 'int':     return inputDef?.bounds ? inputDef.bounds[0] : 0;
        case 'double':  return inputDef?.bounds ? inputDef.bounds[0] : 0.0;
        case 'string':  return '';
        default:        return null;
    }
}

/** Generate a workflow-level input name, skipping the step prefix for single-node workflows. */
function makeWfInputName(stepId, inputName, isSingleNode) {
    return isSingleNode ? inputName : `${stepId}_${inputName}`;
}

/* ========== Extracted sub-functions for buildCWLWorkflowObject ========== */

/**
 * Populate step.in entries and corresponding workflow-level inputs/jobDefaults
 * for one node's required and optional CWL inputs.
 *
 * Mutates: step.in, ctx.wf.inputs, ctx.jobDefaults, ctx.needs* flags.
 */
function buildStepInputBindings(ctx, step, node, effectiveTool, stepId, isSingleNode) {
    const nodeId = node.id;
    const expressions = node.data.expressions || {};

    /* --- required inputs --- */
    Object.entries(effectiveTool.requiredInputs).forEach(([inputName, inputDef]) => {
        const { type } = inputDef;
        const expr = expressions[inputName];
        const wiredSources = ctx.wiredInputsMap.get(nodeId)?.get(inputName) || [];

        if (expr) {
            // Expression mode: valueFrom transforms the input
            ctx.needsStepInputExpression = true;
            ctx.needsInlineJavascript = true;
            if (wiredSources.length === 0) {
                const wfInputName = makeWfInputName(stepId, inputName, isSingleNode);
                ctx.wf.inputs[wfInputName] = { type: toCWLType(type) };
                step.in[inputName] = { source: wfInputName, valueFrom: expr };
            } else if (wiredSources.length === 1) {
                step.in[inputName] = {
                    source: ctx.resolveWiredSource(wiredSources[0]),
                    valueFrom: expr,
                };
            } else {
                const linkMerge = node.data.linkMergeOverrides?.[inputName] || 'merge_flattened';
                step.in[inputName] = {
                    source: wiredSources.map(ws => ctx.resolveWiredSource(ws)),
                    linkMerge,
                    valueFrom: expr,
                };
                ctx.needsMultipleInputFeature = true;
            }
        } else if (wiredSources.length === 1) {
            step.in[inputName] = ctx.resolveWiredSource(wiredSources[0]);
        } else if (wiredSources.length > 1) {
            const linkMerge = node.data.linkMergeOverrides?.[inputName] || 'merge_flattened';
            step.in[inputName] = {
                source: wiredSources.map(ws => ctx.resolveWiredSource(ws)),
                linkMerge,
            };
            ctx.needsMultipleInputFeature = true;
        } else {
            // Not wired - expose as workflow input
            const wfInputName = makeWfInputName(stepId, inputName, isSingleNode);
            const inputType = ctx.scatteredSteps.has(nodeId) && !ctx.gatherNodeIds.has(nodeId)
                && (type === 'File' || type === 'Directory')
                ? toArrayType(type)
                : toCWLType(type);
            ctx.wf.inputs[wfInputName] = { type: inputType };
            step.in[inputName] = wfInputName;

            // Pre-fill jobDefaults for scalar required params if user set a value
            if (type !== 'File' && type !== 'Directory') {
                const params = getUserParams(node.data);
                const userValue = params?.[inputName];
                if (userValue !== undefined && userValue !== null && userValue !== '' && isSerializable(userValue)) {
                    ctx.jobDefaults[wfInputName] = userValue;
                }
            }
        }
    });

    /* --- optional inputs --- */
    if (!effectiveTool.optionalInputs) return;

    Object.entries(effectiveTool.optionalInputs).forEach(([inputName, inputDef]) => {
        const { type } = inputDef;
        const optExpr = expressions[inputName];

        // Expression on optional input: emit valueFrom, respecting wired sources
        if (optExpr) {
            ctx.needsStepInputExpression = true;
            ctx.needsInlineJavascript = true;
            const wiredSources = ctx.wiredInputsMap.get(nodeId)?.get(inputName) || [];
            if (wiredSources.length === 1) {
                step.in[inputName] = {
                    source: ctx.resolveWiredSource(wiredSources[0]),
                    valueFrom: optExpr,
                };
            } else if (wiredSources.length > 1) {
                const linkMerge = node.data.linkMergeOverrides?.[inputName] || 'merge_flattened';
                step.in[inputName] = {
                    source: wiredSources.map(ws => ctx.resolveWiredSource(ws)),
                    linkMerge,
                    valueFrom: optExpr,
                };
                ctx.needsMultipleInputFeature = true;
            } else {
                const wfInputName = makeWfInputName(stepId, inputName, isSingleNode);
                ctx.wf.inputs[wfInputName] = { type: toCWLType(type, true) };
                step.in[inputName] = { source: wfInputName, valueFrom: optExpr };
            }
            return;
        }

        // Skip record types - these are complex types handled by CWL directly
        if (type === 'record') {
            const wfInputName = makeWfInputName(stepId, inputName, isSingleNode);
            const recordEntry = { type: ['null', 'Any'] };
            const params = getUserParams(node.data);
            const recordValue = params?.[inputName];
            if (recordValue !== undefined && recordValue !== null && recordValue !== '' && isSerializable(recordValue)) {
                recordEntry.default = recordValue;
            }
            ctx.wf.inputs[wfInputName] = recordEntry;
            step.in[inputName] = wfInputName;
            return;
        }

        // Check wired sources for non-expression optional inputs
        const wiredSources = ctx.wiredInputsMap.get(nodeId)?.get(inputName) || [];

        if (wiredSources.length === 1) {
            step.in[inputName] = ctx.resolveWiredSource(wiredSources[0]);
        } else if (wiredSources.length > 1) {
            const linkMerge = node.data.linkMergeOverrides?.[inputName] || 'merge_flattened';
            step.in[inputName] = {
                source: wiredSources.map(ws => ctx.resolveWiredSource(ws)),
                linkMerge,
            };
            ctx.needsMultipleInputFeature = true;
        } else {
            // Not wired — expose as nullable workflow input with job default
            const wfInputName = makeWfInputName(stepId, inputName, isSingleNode);
            const inputEntry = { type: toCWLType(type, true) };
            const params = getUserParams(node.data);
            const userValue = params?.[inputName];
            let value;
            if (userValue !== undefined && userValue !== null && userValue !== '' && isSerializable(userValue)) {
                value = userValue;
            } else {
                value = defaultForType(type, inputDef);
                if (inputDef?.hasDefault) ctx.cwlDefaultKeys.add(wfInputName);
            }
            if (value !== null && value !== undefined) {
                ctx.jobDefaults[wfInputName] = value;
            }
            ctx.wf.inputs[wfInputName] = inputEntry;
            step.in[inputName] = wfInputName;
        }
    });
}

/**
 * Compute scatter configuration for a single step.
 *
 * @returns {{ scatter, scatterMethod? }} or null if step is not scattered.
 */
function computeStepScatter(ctx, nodeId, effectiveTool, incomingEdges) {
    if (!ctx.scatteredSteps.has(nodeId)) return null;
    // Gather nodes receive scattered input but do NOT scatter themselves
    if (ctx.gatherNodeIds.has(nodeId)) return null;

    const scatterInputs = [];

    if (ctx.sourceNodeIds.has(nodeId)) {
        // Source node: scatter on File/Directory required inputs that are workflow-level inputs
        Object.entries(effectiveTool.requiredInputs).forEach(([inputName, inputDef]) => {
            const isFileOrDir = inputDef.type === 'File' || inputDef.type === 'Directory';
            const isWired = (ctx.wiredInputsMap.get(nodeId)?.get(inputName)?.length || 0) > 0;
            if (isFileOrDir && !isWired) {
                scatterInputs.push(inputName);
            }
        });
    } else {
        // Downstream node: scatter on inputs wired from scattered upstream
        incomingEdges.forEach(edge => {
            if (!ctx.scatteredSteps.has(edge.source)) return;
            const mappings = edge.data?.mappings || [];
            mappings.forEach(m => {
                if (!scatterInputs.includes(m.targetInput)) {
                    scatterInputs.push(m.targetInput);
                }
            });
        });
        // Also check BIDS edges targeting this node (BIDS nodes are scatter sources)
        ctx.bidsEdges.filter(e => e.target === nodeId).forEach(edge => {
            const mappings = edge.data?.mappings || [];
            mappings.forEach(m => {
                if (!scatterInputs.includes(m.targetInput)) {
                    scatterInputs.push(m.targetInput);
                }
            });
        });
    }

    if (scatterInputs.length === 0) return null;

    const result = {
        scatter: scatterInputs.length === 1 ? scatterInputs[0] : scatterInputs,
    };
    if (scatterInputs.length > 1) {
        result.scatterMethod = 'dotproduct';
    }
    return result;
}

/**
 * Declare workflow-level outputs for all terminal nodes (nodes with no outgoing edges).
 *
 * Mutates: ctx.wf.outputs.
 */
function declareTerminalOutputs(ctx, terminalNodes, conditionalStepIds) {
    terminalNodes.forEach(node => {
        const tool = getToolConfigSync(node.data.label);
        const outputs = tool?.outputs || { output: { type: 'File', label: 'Output' } };
        const stepId = ctx.getStepId(node.id);
        const isSingleTerminal = terminalNodes.length === 1;
        const isScattered = ctx.scatteredSteps.has(node.id) && !ctx.gatherNodeIds.has(node.id);

        Object.entries(outputs).forEach(([outputName, outputDef]) => {
            const wfOutputName = isSingleTerminal
                ? outputName
                : `${stepId}_${outputName}`;

            const outputType = isScattered
                ? toArrayType(outputDef.type)
                : toCWLType(outputDef.type);

            const outputEntry = {
                type: outputType,
                outputSource: `${stepId}/${outputName}`
            };

            // Conditional terminal nodes: output may be null when step is skipped
            if (conditionalStepIds.has(node.id)) {
                outputEntry.type = ['null', outputType];
                outputEntry.pickValue = 'first_non_null';
            }

            ctx.wf.outputs[wfOutputName] = outputEntry;
        });
    });
}

/**
 * Convert the React-Flow graph into a CWL Workflow JS object.
 * Returns the raw object before YAML serialization.
 */
export function buildCWLWorkflowObject(graph) {
    // Pre-process: expand any custom workflow nodes into flat internal nodes
    graph = expandCustomWorkflowNodes(graph);

    // Extract BIDS nodes before filtering (they generate workflow-level inputs)
    const bidsNodes = graph.nodes.filter(n => n.data?.isBIDS && n.data?.bidsSelections);
    const bidsNodeIds = new Set(bidsNodes.map(n => n.id));

    // Collect edges FROM BIDS nodes (used for wired-inputs computation)
    const bidsEdges = graph.edges.filter(e => bidsNodeIds.has(e.source));

    // Filter out ALL dummy nodes (including BIDS) before processing
    const dummyNodeIds = new Set(
        graph.nodes.filter(n => n.data?.isDummy).map(n => n.id)
    );

    // Get non-dummy nodes and filter edges that connect to/from dummy nodes
    const nodes = graph.nodes.filter(n => !n.data?.isDummy);
    const edges = graph.edges.filter(e =>
        !dummyNodeIds.has(e.source) && !dummyNodeIds.has(e.target)
    );

    /* ---------- Pre-compute lookup maps for O(1) access ---------- */
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const nodeById = id => nodeMap.get(id);

    const inEdgeMap = new Map();
    const outEdgeMap = new Map();
    for (const node of nodes) {
        inEdgeMap.set(node.id, []);
        outEdgeMap.set(node.id, []);
    }
    for (const edge of edges) {
        inEdgeMap.get(edge.target)?.push(edge);
        outEdgeMap.get(edge.source)?.push(edge);
    }
    const inEdgesOf = id => inEdgeMap.get(id) || [];
    const outEdgesOf = id => outEdgeMap.get(id) || [];

    /* ---------- topo-sort (Kahn's algorithm) ---------- */
    const incoming = Object.fromEntries(nodes.map(n => [n.id, 0]));
    edges.forEach(e => incoming[e.target]++);
    const queue = nodes.filter(n => incoming[n.id] === 0).map(n => n.id);
    const order = [];
    let head = 0;

    while (head < queue.length) {
        const id = queue[head++];
        order.push(id);
        outEdgesOf(id).forEach(e => {
            if (--incoming[e.target] === 0) queue.push(e.target);
        });
    }

    if (order.length !== nodes.length) {
        throw new Error('Workflow graph has cycles.');
    }

    /* ---------- generate readable step IDs ---------- */
    const toolCounts = {};
    const nodeIdToStepId = {};

    order.forEach((nodeId) => {
        const node = nodeById(nodeId);
        const tool = getToolConfigSync(node.data.label);
        const toolId = tool?.id || node.data.label.toLowerCase().replace(/[^a-z0-9]/g, '_');

        if (!(toolId in toolCounts)) {
            toolCounts[toolId] = 0;
        }
        toolCounts[toolId]++;

        nodeIdToStepId[nodeId] = { toolId, count: toolCounts[toolId] };
    });

    const getStepId = (nodeId) => {
        const { toolId, count } = nodeIdToStepId[nodeId];
        const totalCount = toolCounts[toolId];
        return totalCount > 1 ? `${toolId}_${count}` : toolId;
    };

    /* ---------- resolve CWL source reference for a wired input ---------- */
    const resolveWiredSource = (ws) => {
        if (ws.isBIDSInput) return ws.sourceOutput; // workflow-level input name
        return `${getStepId(ws.sourceNodeId)}/${ws.sourceOutput}`;
    };

    /* ---------- compute scatter propagation ---------- */
    const scatterNodes = [...nodes, ...bidsNodes];
    const scatterEdges = [...edges, ...bidsEdges];
    const { scatteredNodeIds: scatteredSteps, sourceNodeIds, gatherNodeIds } = computeScatteredNodes(scatterNodes, scatterEdges);

    /* ---------- build CWL skeleton ---------- */
    const wf = {
        cwlVersion: 'v1.2',
        class: 'Workflow',
        inputs: {},
        outputs: {},
        steps: {}
    };

    // Generate workflow-level File[] inputs only for BIDS selections consumed by non-dummy nodes
    const consumedBidsSelections = new Set();
    for (const edge of bidsEdges) {
        if (dummyNodeIds.has(edge.target)) continue;
        for (const m of (edge.data?.mappings || [])) {
            consumedBidsSelections.add(m.sourceOutput);
        }
    }
    for (const selKey of consumedBidsSelections) {
        wf.inputs[selKey] = { type: { type: 'array', items: 'File' } };
    }

    const conditionalStepIds = new Set();
    const jobDefaults = {};
    const cwlDefaultKeys = new Set();

    /* ---------- pre-compute wired inputs per node from edge mappings ---------- */
    // wiredInputsMap: Map<nodeId, Map<inputName, Array<{ sourceNodeId, sourceOutput, isBIDSInput? }>>>
    const wiredInputsMap = new Map();
    for (const edge of edges) {
        const mappings = edge.data?.mappings || [];
        for (const m of mappings) {
            if (!wiredInputsMap.has(edge.target)) wiredInputsMap.set(edge.target, new Map());
            const nodeInputs = wiredInputsMap.get(edge.target);
            const sourceInfo = { sourceNodeId: edge.source, sourceOutput: m.sourceOutput };
            if (nodeInputs.has(m.targetInput)) {
                nodeInputs.get(m.targetInput).push(sourceInfo);
            } else {
                nodeInputs.set(m.targetInput, [sourceInfo]);
            }
        }
    }

    // Add BIDS edges to the wired inputs map (BIDS sources are workflow-level inputs)
    for (const edge of bidsEdges) {
        const mappings = edge.data?.mappings || [];
        for (const m of mappings) {
            if (!wiredInputsMap.has(edge.target)) wiredInputsMap.set(edge.target, new Map());
            const nodeInputs = wiredInputsMap.get(edge.target);
            const sourceInfo = {
                sourceNodeId: null,
                sourceOutput: m.sourceOutput, // This is the BIDS selection key (workflow input name)
                isBIDSInput: true,
            };
            if (nodeInputs.has(m.targetInput)) {
                nodeInputs.get(m.targetInput).push(sourceInfo);
            } else {
                nodeInputs.set(m.targetInput, [sourceInfo]);
            }
        }
    }

    /* ---------- shared context for extracted helpers ---------- */
    const ctx = {
        wf, jobDefaults, cwlDefaultKeys, wiredInputsMap, scatteredSteps, sourceNodeIds, gatherNodeIds,
        bidsEdges, resolveWiredSource, getStepId,
        needsMultipleInputFeature: false,
        needsInlineJavascript: false,
        needsStepInputExpression: false,
    };

    /* ---------- walk nodes in topo order ---------- */
    order.forEach((nodeId) => {
        const node = nodeById(nodeId);
        const { label } = node.data;

        const tool = getToolConfigSync(label);

        // Generic fallback for undefined tools
        const genericTool = {
            id: label.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            cwlPath: `cwl/generic/${label.toLowerCase().replace(/[^a-z0-9]/g, '_')}.cwl`,
            requiredInputs: {
                input: { type: 'File', label: 'Input' }
            },
            optionalInputs: {},
            outputs: { output: { type: 'File', label: 'Output' } }
        };

        const effectiveTool = tool || genericTool;

        const stepId = getStepId(nodeId);
        const isSingleNode = nodes.length === 1;

        // Step skeleton
        const step = {
            run: `../${effectiveTool.cwlPath}`,
            in: {},
            out: Object.keys(effectiveTool.outputs)
        };

        // Populate step.in and workflow inputs
        buildStepInputBindings(ctx, step, node, effectiveTool, stepId, isSingleNode);

        // Add Docker hints
        const dockerVersion = node.data.dockerVersion || 'latest';
        const dockerImage = effectiveTool.dockerImage;

        if (dockerImage) {
            step.hints = {
                DockerRequirement: {
                    dockerPull: `${dockerImage}:${dockerVersion}`
                }
            };
        }

        // Compute scatter for this step
        const scatterConfig = computeStepScatter(ctx, nodeId, effectiveTool, inEdgesOf(nodeId));

        // Build final step with CWL-conventional property order: run, scatter, in, out, hints
        const finalStep = { run: step.run };
        if (scatterConfig) {
            finalStep.scatter = scatterConfig.scatter;
            if (scatterConfig.scatterMethod) finalStep.scatterMethod = scatterConfig.scatterMethod;
        }
        finalStep.in = step.in;
        finalStep.out = step.out;
        if (step.hints) finalStep.hints = step.hints;

        // Conditional execution (when clause)
        if (node.data.whenExpression && node.data.whenExpression.trim()) {
            finalStep.when = node.data.whenExpression.trim();
            conditionalStepIds.add(nodeId);
            ctx.needsInlineJavascript = true;
        }

        wf.steps[stepId] = finalStep;
    });

    /* ---------- assemble requirements ---------- */
    const requirements = {};
    if (ctx.needsInlineJavascript) requirements.InlineJavascriptRequirement = {};
    if (scatteredSteps.size > 0) requirements.ScatterFeatureRequirement = {};
    if (ctx.needsMultipleInputFeature) requirements.MultipleInputFeatureRequirement = {};
    if (ctx.needsStepInputExpression) requirements.StepInputExpressionRequirement = {};
    if (Object.keys(requirements).length > 0) wf.requirements = requirements;

    /* ---------- declare ALL outputs from terminal nodes ---------- */
    const terminalNodes = nodes.filter(n => outEdgesOf(n.id).length === 0);
    declareTerminalOutputs(ctx, terminalNodes, conditionalStepIds);

    return { wf, jobDefaults, cwlDefaultKeys };
}



/**
 * Generate a job input template from a CWL workflow object.
 * Mirrors the behavior of `cwltool --make-template`.
 */
export function buildJobTemplate(wf, jobDefaults = {}, cwlDefaultKeys = new Set()) {
    const placeholderForType = (cwlType) => {
        if (cwlType == null) return null;

        // Nullable / union: ['null', X] → placeholder for X
        if (Array.isArray(cwlType)) {
            const nonNull = cwlType.find(t => t !== 'null');
            return nonNull ? placeholderForType(nonNull) : null;
        }

        // Array: { type: 'array', items: T } → [placeholder(T)]
        if (typeof cwlType === 'object' && cwlType.type === 'array') {
            return [placeholderForType(cwlType.items)];
        }

        // Primitive types
        switch (cwlType) {
            case 'File':      return { class: 'File', path: 'a/file/path' };
            case 'Directory':  return { class: 'Directory', path: 'a/directory/path' };
            case 'string':     return 'a_string';
            case 'int':
            case 'long':       return 0;
            case 'float':
            case 'double':     return 0.1;
            case 'boolean':    return false;
            default:           return null;
        }
    };

    const template = {};
    const defaultKeys = new Set(cwlDefaultKeys);
    for (const [name, def] of Object.entries(wf.inputs)) {
        if (jobDefaults[name] !== undefined) {
            template[name] = jobDefaults[name];
        } else if (def.default !== undefined) {
            template[name] = def.default;
            defaultKeys.add(name);
        } else {
            template[name] = placeholderForType(def.type);
        }
    }
    let yaml = YAML.dump(template, { noRefs: true });
    // Annotate lines whose values come from CWL tool defaults
    for (const key of defaultKeys) {
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`^(${escaped}:.*)$`, 'm');
        yaml = yaml.replace(re, `$1  # tool default`);
    }
    return yaml;
}
