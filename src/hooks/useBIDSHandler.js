import { useState, useRef } from 'react';
import { parseBIDSDirectory } from '../utils/bidsParser.js';

/**
 * Custom hook encapsulating all BIDS node state and handlers.
 * Manages the BIDS directory picker, modal state, and node updates
 * for both regular BIDS nodes and internal BIDS nodes within custom workflows.
 */
export function useBIDSHandler({ setNodes, markForSync, showError, showWarning, showInfo }) {
    const [showBIDSModal, setShowBIDSModal] = useState(false);
    const [bidsModalNodeId, setBidsModalNodeId] = useState(null);
    const bidsFileInputRef = useRef(null);
    const bidsPickerTargetRef = useRef(null);

    const handleBIDSNodeUpdate = (nodeId, updates) => {
        // Handle signal actions from NodeComponent
        if (updates._openModal) {
            bidsPickerTargetRef.current = nodeId;
            setBidsModalNodeId(nodeId);
            setShowBIDSModal(true);
            return;
        }
        if (updates._pickDirectory) {
            bidsPickerTargetRef.current = nodeId;
            bidsFileInputRef.current?.click();
            return;
        }
        // Normal data update
        setNodes((prevNodes) =>
            prevNodes.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, ...updates } }
                    : node
            )
        );
        markForSync();
    };

    // Update an internal BIDS node within a custom workflow node
    const updateInternalBIDSNode = (cwNodeId, updates) => {
        setNodes((prevNodes) =>
            prevNodes.map((node) => {
                if (node.id !== cwNodeId) return node;
                const updatedInternalNodes = (node.data.internalNodes || []).map(n =>
                    n.isBIDS ? { ...n, ...updates } : n
                );
                return {
                    ...node,
                    data: { ...node.data, internalNodes: updatedInternalNodes }
                };
            })
        );
        markForSync();
    };

    // Handle BIDS actions for internal BIDS nodes within custom workflows
    const handleInternalBIDSUpdate = (cwNodeId, updates) => {
        if (updates._openModal) {
            bidsPickerTargetRef.current = { cwNodeId };
            setBidsModalNodeId(cwNodeId);
            setShowBIDSModal(true);
            return;
        }
        if (updates._pickDirectory) {
            bidsPickerTargetRef.current = { cwNodeId };
            bidsFileInputRef.current?.click();
            return;
        }
    };

    const triggerBIDSDirectoryPicker = (nodeId) => {
        bidsPickerTargetRef.current = nodeId;
        bidsFileInputRef.current?.click();
    };

    const handleBIDSDirectorySelected = async (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const target = bidsPickerTargetRef.current;
        if (!target) return;

        const result = await parseBIDSDirectory(files);

        if (result.errors.length > 0) {
            result.errors.forEach(e => showError(e, 6000));
            // Reset file input
            event.target.value = '';
            return;
        }

        if (result.warnings.length > 0) {
            result.warnings.forEach(w => showWarning(w, 5000));
        }

        if (result.info.length > 0) {
            showInfo(result.info.join(' '));
        }

        // Store structure and open modal — route to internal or regular BIDS node
        if (target !== null && typeof target === 'object' && target.cwNodeId) {
            updateInternalBIDSNode(target.cwNodeId, { bidsStructure: result.bidsStructure });
            setBidsModalNodeId(target.cwNodeId);
        } else {
            handleBIDSNodeUpdate(target, { bidsStructure: result.bidsStructure });
            setBidsModalNodeId(target);
        }
        setShowBIDSModal(true);

        // Reset file input so same directory can be re-selected
        event.target.value = '';
    };

    const handleBIDSModalClose = (bidsSelections) => {
        if (bidsSelections && bidsModalNodeId) {
            const target = bidsPickerTargetRef.current;
            if (target !== null && typeof target === 'object' && target.cwNodeId) {
                // Internal BIDS node within a custom workflow
                updateInternalBIDSNode(target.cwNodeId, { bidsSelections });
            } else {
                // Regular BIDS node
                handleBIDSNodeUpdate(bidsModalNodeId, { bidsSelections });
            }
        }
        setShowBIDSModal(false);
        setBidsModalNodeId(null);
    };

    return {
        showBIDSModal,
        bidsModalNodeId,
        bidsFileInputRef,
        bidsPickerTargetRef,
        handleBIDSNodeUpdate,
        handleInternalBIDSUpdate,
        triggerBIDSDirectoryPicker,
        handleBIDSDirectorySelected,
        handleBIDSModalClose,
    };
}
