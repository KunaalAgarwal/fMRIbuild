import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import YAML from 'js-yaml';
import { buildCWLWorkflow } from './buildWorkflow.js';
import { TOOL_MAP } from '../../public/cwl/toolMap.js';

export function useGenerateWorkflow() {
    /**
     * Builds main.cwl, pulls tool CWL files, zips, and downloads.
     * Works both in `npm run dev` (BASE_URL = "/") and on GitHub Pages
     * (BASE_URL = "/fMRIbuild/").
     */
    const generateWorkflow = async (getWorkflowData) => {
        if (typeof getWorkflowData !== 'function') {
            console.error('generateWorkflow expects a function');
            return;
        }

        const graph = getWorkflowData();
        if (!graph || !graph.nodes || graph.nodes.length === 0) {
            alert('Empty workflow — nothing to export.');
            return;
        }

        /* ---------- build CWL workflow ---------- */
        let mainCWL;
        try {
            mainCWL = buildCWLWorkflow(graph);
        } catch (err) {
            alert(`Workflow build failed:\n${err.message}`);
            return;
        }

        // Add shebang to make it executable
        const shebang = '#!/usr/bin/env cwl-runner\n\n';
        mainCWL = shebang + mainCWL;

        /* ---------- prepare ZIP ---------- */
        const zip = new JSZip();
        zip.file('workflows/main.cwl', mainCWL);

        // baseURL ends in "/", ensure single slash join
        const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');

        /* ---------- fetch README ---------- */
        try {
            const readmeRes = await fetch(`${base}README.md`);
            if (readmeRes.ok) {
                zip.file('README.md', await readmeRes.text());
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
            alert(`Unable to fetch tool file:\n${err.message}`);
            return;
        }

        /* ---------- download ---------- */
        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, 'workflow_bundle.zip');
    };

    return { generateWorkflow };
}