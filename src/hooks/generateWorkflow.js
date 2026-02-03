import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import YAML from 'js-yaml';
import { buildCWLWorkflow } from './buildWorkflow.js';
import { TOOL_MAP } from '../../public/cwl/toolMap.js';
import { useToast } from '../context/ToastContext.jsx';

export function useGenerateWorkflow() {
    const { showError, showWarning } = useToast();
    /**
     * Sanitize workflow name for safe use as a filename.
     * Security: Prevents path traversal, code injection, and special characters.
     * - Only allows alphanumeric, underscore, and hyphen
     * - Removes path separators (/, \, ..)
     * - Limits length to prevent filesystem issues
     * - Falls back to 'main' for empty/invalid input
     */
    const sanitizeFilename = (name) => {
        if (!name || typeof name !== 'string') return 'main';

        const sanitized = name
            .trim()
            .toLowerCase()
            // Remove any path traversal attempts
            .replace(/\.\./g, '')
            .replace(/[/\\]/g, '')
            // Only allow alphanumeric, underscore, hyphen
            .replace(/[^a-z0-9_-]/g, '_')
            // Collapse multiple underscores
            .replace(/_+/g, '_')
            // Remove leading/trailing underscores
            .replace(/^_|_$/g, '')
            // Limit length to 50 characters
            .slice(0, 50);

        return sanitized || 'main';
    };

    /**
     * Builds main.cwl, pulls tool CWL files, zips, and downloads.
     * Works both in `npm run dev` (BASE_URL = "/") and on GitHub Pages
     * (BASE_URL = "/niBuild/").
     */
    const generateWorkflow = async (getWorkflowData, workflowName = '') => {
        if (typeof getWorkflowData !== 'function') {
            console.error('generateWorkflow expects a function');
            return;
        }

        const graph = getWorkflowData();
        if (!graph || !graph.nodes || graph.nodes.length === 0) {
            showWarning('Empty workflow — nothing to export.');
            return;
        }

        const safeWorkflowName = sanitizeFilename(workflowName);

        /* ---------- build CWL workflow ---------- */
        let mainCWL;
        try {
            mainCWL = buildCWLWorkflow(graph);
        } catch (err) {
            showError(`Workflow build failed: ${err.message}`);
            return;
        }

        // Add shebang to make it executable
        const shebang = '#!/usr/bin/env cwl-runner\n\n';
        mainCWL = shebang + mainCWL;

        /* ---------- prepare ZIP ---------- */
        const zip = new JSZip();
        zip.file(`workflows/${safeWorkflowName}.cwl`, mainCWL);

        // baseURL ends in "/", ensure single slash join
        const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');

        /* ---------- fetch README ---------- */
        try {
            const readmeRes = await fetch(`${base}README.md`);
            if (readmeRes.ok) {
                let readmeContent = await readmeRes.text();
                readmeContent = readmeContent.replace(/main\.cwl/g, `${safeWorkflowName}.cwl`);
                zip.file('README.md', readmeContent);
            }
        } catch (err) {
            console.warn('Could not fetch README.md:', err.message);
        }

        /* ---------- build Docker version map for each tool path ---------- */
        // Maps cwlPath -> { dockerImage, dockerVersion }
        const dockerVersionMap = {};
        graph.nodes.forEach(node => {
            const tool = TOOL_MAP[node.data.label];
            if (tool?.cwlPath && tool?.dockerImage) {
                // Use the node's dockerVersion, defaulting to 'latest'
                const version = node.data.dockerVersion || 'latest';
                // If multiple nodes use the same tool, use the first non-'latest' version,
                // or the last specified version if all are 'latest'
                if (!dockerVersionMap[tool.cwlPath] ||
                    (dockerVersionMap[tool.cwlPath].dockerVersion === 'latest' && version !== 'latest')) {
                    dockerVersionMap[tool.cwlPath] = {
                        dockerImage: tool.dockerImage,
                        dockerVersion: version
                    };
                }
            }
        });

        /* ---------- fetch each unique tool file and inject Docker version ---------- */
        const uniquePaths = [
            ...new Set(graph.nodes.map(n => TOOL_MAP[n.data.label]?.cwlPath).filter(Boolean))
        ];

        try {
            for (const p of uniquePaths) {
                const res = await fetch(`${base}${p}`);
                if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

                let cwlContent = await res.text();

                // Inject Docker version if we have one for this tool
                const dockerInfo = dockerVersionMap[p];
                if (dockerInfo) {
                    try {
                        // Parse the CWL YAML
                        const cwlDoc = YAML.load(cwlContent);

                        // Update or create the DockerRequirement hint
                        if (!cwlDoc.hints) {
                            cwlDoc.hints = {};
                        }
                        cwlDoc.hints.DockerRequirement = {
                            dockerPull: `${dockerInfo.dockerImage}:${dockerInfo.dockerVersion}`
                        };

                        // Re-serialize to YAML, preserving the shebang if present
                        const hasShebang = cwlContent.startsWith('#!/');
                        const shebangLine = hasShebang ? cwlContent.split('\n')[0] + '\n\n' : '';
                        cwlContent = shebangLine + YAML.dump(cwlDoc, { noRefs: true, lineWidth: -1 });
                    } catch (parseErr) {
                        console.warn(`Could not parse CWL file ${p} for Docker injection:`, parseErr.message);
                        // Keep original content if parsing fails
                    }
                }

                zip.file(p, cwlContent);
            }
        } catch (err) {
            showError(`Unable to fetch tool file: ${err.message}`);
            return;
        }

        /* ---------- download ---------- */
        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, 'workflow_bundle.zip');
    };

    return { generateWorkflow };
}