import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

const ToastContext = createContext(null);

/**
 * Toast notification provider using React Bootstrap.
 * Replaces blocking alert() calls with non-blocking toasts.
 */
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, variant = 'danger', duration = 5000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, variant, duration }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showError = useCallback((message) => {
        addToast(message, 'danger', 6000);
    }, [addToast]);

    const showWarning = useCallback((message) => {
        addToast(message, 'warning', 5000);
    }, [addToast]);

    const showSuccess = useCallback((message) => {
        addToast(message, 'success', 4000);
    }, [addToast]);

    const showInfo = useCallback((message) => {
        addToast(message, 'info', 4000);
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ showError, showWarning, showSuccess, showInfo }}>
            {children}
            <ToastContainer
                position="top-end"
                className="p-3"
                style={{ zIndex: 9999 }}
            >
                {toasts.map(toast => (
                    <Toast
                        key={toast.id}
                        onClose={() => removeToast(toast.id)}
                        autohide
                        delay={toast.duration}
                        bg={toast.variant}
                    >
                        <Toast.Header closeButton>
                            <strong className="me-auto">
                                {toast.variant === 'danger' ? 'Error' :
                                 toast.variant === 'warning' ? 'Warning' :
                                 toast.variant === 'success' ? 'Success' : 'Info'}
                            </strong>
                        </Toast.Header>
                        <Toast.Body className={toast.variant === 'danger' || toast.variant === 'warning' ? 'text-white' : ''}>
                            {toast.message}
                        </Toast.Body>
                    </Toast>
                ))}
            </ToastContainer>
        </ToastContext.Provider>
    );
}

/**
 * Hook to access toast notifications.
 * @returns {{ showError, showWarning, showSuccess, showInfo }}
 */
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        // Fallback to alert if ToastProvider is not available
        return {
            showError: (msg) => alert(msg),
            showWarning: (msg) => alert(msg),
            showSuccess: (msg) => alert(msg),
            showInfo: (msg) => alert(msg)
        };
    }
    return context;
}
