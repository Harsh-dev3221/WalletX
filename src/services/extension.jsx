/**
 * Extension Communication Service
 * 
 * This service handles all communication between the Cross-Net Wallet UI and websites
 * via our content script and background script.
 */

// Track all pending requests
const pendingRequests = {};

// Check if we're running in a browser extension context
const isExtensionContext = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

/**
 * Send a message to a tab via content script
 * @param {number} tabId - The tab ID to send the message to
 * @param {object} message - The message to send
 * @returns {Promise} - A promise that resolves with the response
 */
export const sendMessageToTab = (tabId, message) => {
    return new Promise((resolve, reject) => {
        // If not in extension context, reject with appropriate message
        if (!isExtensionContext) {
            console.warn('Cannot send message to tab: Not running in extension context');
            reject(new Error('Extension APIs not available'));
            return;
        }

        try {
            const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

            // Store the request in our pending requests object
            pendingRequests[requestId] = { resolve, reject };

            // Add the request ID to the message
            const messageWithId = {
                ...message,
                requestId
            };

            // Send message to content script
            chrome.tabs.sendMessage(tabId, messageWithId, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error sending message to tab:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                    delete pendingRequests[requestId];
                    return;
                }

                // If we get an immediate response, resolve now
                if (response) {
                    resolve(response);
                    delete pendingRequests[requestId];
                }
                // Otherwise, the response will come later via the message listener
            });
        } catch (error) {
            console.error('Error in sendMessageToTab:', error);
            reject(error);
        }
    });
};

/**
 * Send a message to the background script
 * @param {object} message - The message to send
 * @returns {Promise} - A promise that resolves with the response
 */
export const sendMessageToBackground = (message) => {
    return new Promise((resolve, reject) => {
        // If not in extension context, provide mock responses for development
        if (!isExtensionContext) {
            console.warn('Cannot send message to background: Not running in extension context');

            // For development: Return mock responses based on message type
            if (message.type === 'GET_PENDING_REQUESTS') {
                resolve({ pendingRequests: [] });
                return;
            } else if (message.type === 'GET_STATE') {
                resolve({
                    state: {
                        isUnlocked: true,
                        accounts: [],
                        selectedChainId: '0x1', // Default to ETH mainnet
                        connectedSites: {}
                    }
                });
                return;
            } else if (message.type === 'APPROVE_CONNECTION' ||
                message.type === 'REJECT_CONNECTION' ||
                message.type === 'APPROVE_TRANSACTION' ||
                message.type === 'REJECT_TRANSACTION' ||
                message.type === 'CHAIN_CHANGED' ||
                message.type === 'SITE_DISCONNECTED') {
                // Mock successful responses for these actions
                resolve({ success: true });
                return;
            } else {
                console.log('Mock response not implemented for message type:', message.type);
                resolve({ mock: true, message: 'This is a mock response in web mode' });
                return;
            }
        }

        try {
            const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

            // Store the request in our pending requests object
            pendingRequests[requestId] = { resolve, reject };

            // Add the request ID to the message
            const messageWithId = {
                ...message,
                requestId
            };

            // Send message to background script
            chrome.runtime.sendMessage(messageWithId, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error sending message to background:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                    delete pendingRequests[requestId];
                    return;
                }

                // If we get an immediate response, resolve now
                if (response) {
                    resolve(response);
                    delete pendingRequests[requestId];
                }
                // Otherwise, the response will come later via the message listener
            });
        } catch (error) {
            console.error('Error in sendMessageToBackground:', error);
            reject(error);
        }
    });
};

/**
 * Approve a connection request from a website
 * @param {string} requestId - The ID of the request to approve
 * @param {array} accounts - The accounts to share with the website
 * @returns {Promise} - A promise that resolves when the request is approved
 */
export const approveConnection = (requestId, accounts) => {
    return sendMessageToBackground({
        type: 'APPROVE_CONNECTION',
        requestId,
        accounts
    });
};

/**
 * Reject a connection request from a website
 * @param {string} requestId - The ID of the request to reject
 * @returns {Promise} - A promise that resolves when the request is rejected
 */
export const rejectConnection = (requestId) => {
    return sendMessageToBackground({
        type: 'REJECT_CONNECTION',
        requestId
    });
};

/**
 * Approve a transaction request
 * @param {string} requestId - The ID of the request to approve
 * @returns {Promise} - A promise that resolves when the transaction is approved
 */
export const approveTransaction = (requestId) => {
    return sendMessageToBackground({
        type: 'APPROVE_TRANSACTION',
        requestId
    });
};

/**
 * Reject a transaction request
 * @param {string} requestId - The ID of the request to reject
 * @returns {Promise} - A promise that resolves when the transaction is rejected
 */
export const rejectTransaction = (requestId) => {
    return sendMessageToBackground({
        type: 'REJECT_TRANSACTION',
        requestId
    });
};

/**
 * Change the active blockchain network
 * @param {string} chainId - The chain ID to switch to
 * @returns {Promise} - A promise that resolves when the chain is changed
 */
export const changeNetwork = (chainId) => {
    return sendMessageToBackground({
        type: 'CHAIN_CHANGED',
        chainId
    });
};

/**
 * Disconnect a website
 * @param {string} origin - The origin of the website to disconnect
 * @returns {Promise} - A promise that resolves when the site is disconnected
 */
export const disconnectSite = (origin) => {
    return sendMessageToBackground({
        type: 'SITE_DISCONNECTED',
        origin
    });
};

/**
 * Set up a listener for responses from the background script
 * This should be called once when the extension popup initializes
 */
export const initializeMessageListener = () => {
    // Only set up listener if we're in an extension context
    if (!isExtensionContext) {
        console.warn('Cannot initialize message listener: Not running in extension context');
        return;
    }

    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Message received in extension UI:', message);

        // Handle different message types
        if (message.type === 'PENDING_REQUEST' && message.requestId) {
            // This is a request from a website that needs user approval
            // The popup will need to display this request to the user

            // Return true to indicate we'll handle this asynchronously
            return true;
        }

        // If this is a response to one of our pending requests
        if (message.requestId && pendingRequests[message.requestId]) {
            const { resolve, reject } = pendingRequests[message.requestId];

            if (message.error) {
                reject(new Error(message.error.message || 'Unknown error'));
            } else {
                resolve(message.result || message);
            }

            delete pendingRequests[message.requestId];
            // Return true to indicate we'll handle this asynchronously
            return true;
        }

        // Return false if we don't handle this message
        return false;
    });
};

// Automatically initialize the message listener when this module is imported
// but only if we're in an extension context
if (isExtensionContext) {
    initializeMessageListener();
} 