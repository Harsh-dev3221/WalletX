import { useState, useEffect } from 'react';
import { sendMessageToBackground } from '../services/extension.jsx';

// Check if we're running in a browser extension context
const isExtensionContext = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

/**
 * Custom hook for managing extension requests from websites
 * 
 * @param {Object} wallet - The user's wallet object
 * @returns {Object} - Request state and handler functions
 */
export const useExtensionRequests = (wallet) => {
    const [pendingRequests, setPendingRequests] = useState([]);
    const [currentRequest, setCurrentRequest] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Initialize and fetch any pending requests
    useEffect(() => {
        const fetchPendingRequests = async () => {
            try {
                setLoading(true);

                const response = await new Promise((resolve, reject) => {
                    const timeoutId = setTimeout(() => {
                        reject(new Error('Request timed out after 10 seconds'));
                    }, 10000);

                    chrome.runtime.sendMessage({ type: 'GET_PENDING_REQUESTS' }, (response) => {
                        clearTimeout(timeoutId);
                        if (chrome.runtime.lastError) {
                            console.error('Error fetching pending requests:', chrome.runtime.lastError);
                            reject(new Error(chrome.runtime.lastError.message));
                            return;
                        }
                        resolve(response || { pendingRequests: [] });
                    });
                });

                console.log('Received pending requests:', response);

                if (response && response.pendingRequests) {
                    setPendingRequests(response.pendingRequests);

                    // If there are pending requests, set the first one as current
                    if (response.pendingRequests.length > 0) {
                        setCurrentRequest(response.pendingRequests[0]);
                    }
                }
            } catch (err) {
                console.error('Error fetching pending requests:', err);
                // Don't set error in non-extension context to avoid unnecessary UI errors
                if (isExtensionContext) {
                    setError('Failed to fetch pending requests: ' + err.message);
                }
            } finally {
                setLoading(false);
            }
        };

        // Only set up listeners in extension context
        if (isExtensionContext) {
            // Set up listener for new requests
            const messageListener = (message) => {
                if (message.type === 'PENDING_REQUEST') {
                    // Add the new request to our list
                    setPendingRequests(prevRequests => [...prevRequests, message]);

                    // If no current request is being shown, set this as current
                    if (!currentRequest) {
                        setCurrentRequest(message);
                    }
                }
            };

            // Add message listener
            chrome.runtime.onMessage.addListener(messageListener);

            // Initial fetch
            fetchPendingRequests();

            // Cleanup
            return () => {
                chrome.runtime.onMessage.removeListener(messageListener);
            };
        } else {
            // In non-extension context, just set loading to false
            setLoading(false);
        }
    }, [currentRequest]);

    /**
     * Approve the current request
     */
    const approveCurrentRequest = async () => {
        if (!currentRequest || !wallet || !isExtensionContext) return;

        setLoading(true);
        setError(null);

        try {
            const { type, requestId } = currentRequest;

            if (type === 'connect') {
                // Connection request
                await sendMessageToBackground({
                    type: 'APPROVE_CONNECTION',
                    requestId,
                    accounts: [wallet.address]
                });
            } else {
                // Transaction request
                await sendMessageToBackground({
                    type: 'APPROVE_TRANSACTION',
                    requestId
                });
            }

            // Remove this request and show the next one
            removeCurrentRequest();
        } catch (err) {
            console.error('Error approving request:', err);
            setError(err.message || 'Failed to approve request');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Reject the current request
     */
    const rejectCurrentRequest = async () => {
        if (!currentRequest || !isExtensionContext) return;

        setLoading(true);
        setError(null);

        try {
            const { type, requestId } = currentRequest;

            if (type === 'connect') {
                // Connection request
                await sendMessageToBackground({
                    type: 'REJECT_CONNECTION',
                    requestId
                });
            } else {
                // Transaction request
                await sendMessageToBackground({
                    type: 'REJECT_TRANSACTION',
                    requestId
                });
            }

            // Remove this request and show the next one
            removeCurrentRequest();
        } catch (err) {
            console.error('Error rejecting request:', err);
            setError(err.message || 'Failed to reject request');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Remove the current request and show the next one (if available)
     */
    const removeCurrentRequest = () => {
        setPendingRequests(prevRequests => {
            const newRequests = prevRequests.filter(req => req.requestId !== currentRequest.requestId);

            // If there are more requests, set the next one as current
            if (newRequests.length > 0) {
                setCurrentRequest(newRequests[0]);
            } else {
                setCurrentRequest(null);
            }

            return newRequests;
        });
    };

    return {
        // State
        pendingRequests,
        currentRequest,
        loading,
        error,
        hasRequests: pendingRequests.length > 0,
        isExtensionContext,

        // Actions
        approveCurrentRequest,
        rejectCurrentRequest,
        removeCurrentRequest,
    };
};

export default useExtensionRequests; 