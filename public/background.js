/**
 * Cross-Net Wallet Background Script
 * 
 * This script runs in the background and is responsible for:
 * 1. Managing wallet state and storage
 * 2. Processing connection requests from websites
 * 3. Handling transaction signing and approval
 * 4. Communication between content scripts and the extension UI
 * 5. Supporting WalletConnect protocol for external connections
 */

// Extension state
let state = {
    isUnlocked: false,
    accounts: [
        "0xeA68d68857d1F8B3f2bCf540590cB9bbC6F2F5Cb", // Mock account for testing
        "0x2B5634C42055806a59e9107ED44D43c426E58258"  // Second mock account
    ],
    selectedChainId: '0x1', // Ethereum Mainnet
    pendingRequests: {},
    connectedSites: {}, // {origin: {origin, accounts, chainId, connected, permissions}}
    walletConnectSessions: [], // Store active WalletConnect sessions
    pendingTransactions: {},
    transactions: [],
    walletConnect: {
        sessions: {},
        pendingRequests: {}
    },
    watchedAssets: {} // Custom tokens
};

// Initialize state from storage
chrome.storage.local.get(['state', 'connectedSites', 'walletConnectSessions'], (result) => {
    if (result.state) {
        state = { ...state, ...result.state };
    }

    if (result.connectedSites) {
        state.connectedSites = result.connectedSites;
    }

    if (result.walletConnectSessions) {
        state.walletConnectSessions = result.walletConnectSessions;
    }

    console.log('Wallet state initialized:', state);
});

// Message handler from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        console.log('Background received message:', message, 'from', sender);

        // Handle different message types
        switch (message.type) {
            case 'GET_STATE':
                handleGetState(message, new URL(sender.tab.url).origin, sendResponse);
                return false;

            case 'CONNECT_REQUEST':
                return handleConnectRequest(message, sender, sendResponse);

            case 'APPROVE_CONNECTION':
                handleConnectionApproval(message, sendResponse);
                return true;

            case 'REJECT_CONNECTION':
                handleConnectionRejection(message, sendResponse);
                return true;

            case 'TRANSACTION_REQUEST':
            case 'SEND_TRANSACTION_REQUEST':
            case 'SIGN_TRANSACTION_REQUEST':
                handleTransactionRequest(message, sender, sendResponse);
                return true;

            case 'APPROVE_TRANSACTION':
                handleTransactionApproval(message, sendResponse);
                return true;

            case 'REJECT_TRANSACTION':
                handleTransactionRejection(message, sendResponse);
                return true;

            case 'CHAIN_CHANGED':
                handleChainChanged(message.chainId, sendResponse);
                return false;

            case 'SITE_DISCONNECTED':
                handleSiteDisconnected(message, sendResponse);
                return false;

            // WalletConnect specific message handlers
            case 'WALLETCONNECT_INIT':
                handleWalletConnectInit(message, sendResponse);
                return true;

            case 'WALLETCONNECT_SESSION_REQUEST':
                handleWalletConnectSessionRequest(message, sendResponse);
                return true;

            case 'WALLETCONNECT_APPROVE_SESSION':
                handleWalletConnectApproveSession(message, sendResponse);
                return true;

            case 'WALLETCONNECT_REJECT_SESSION':
                handleWalletConnectRejectSession(message, sendResponse);
                return true;

            case 'WALLETCONNECT_CALL_REQUEST':
                handleWalletConnectCallRequest(message, sendResponse);
                return true;

            case 'WALLETCONNECT_APPROVE_CALL_REQUEST':
                handleWalletConnectApproveCallRequest(message, sendResponse);
                return true;

            case 'WALLETCONNECT_REJECT_CALL_REQUEST':
                handleWalletConnectRejectCallRequest(message, sendResponse);
                return true;

            case 'WALLETCONNECT_DISCONNECT':
                handleWalletConnectDisconnect(message, sendResponse);
                return true;

            case 'GET_PENDING_REQUESTS':
                const pendingRequests = Object.values(state.pendingRequests);
                console.log('Sending pending requests:', pendingRequests);
                sendResponse(pendingRequests);
                return true;

            case 'WEB3_REQUEST':
                // Handle different Web3 method calls
                return handleWeb3Request(message, sender, sendResponse);

            case 'CONNECTION_APPROVED':
                return handleConnectionApproval(message, sender, sendResponse);

            case 'CONNECTION_REJECTED':
                return handleConnectionRejection(message, sender, sendResponse);

            default:
                console.log('Unknown message type received:', message.type);
                sendResponse({ error: `Unknown message type: ${message.type}` });
                return true;
        }
    } catch (error) {
        console.error('Error processing message:', error);
        sendResponse({ error: error.message || 'Unknown error processing message' });
        return true;
    }
});

// Handle connection request from a dApp
function handleConnectRequest(message, sender, sendResponse) {
    try {
        console.log('Connect request received:', message);

        // Get the site's origin
        const origin = message.origin;

        // Look for the site in connected sites
        if (state.connectedSites[origin]) {
            console.log('Site already connected:', origin, state.connectedSites[origin]);

            // If site is already connected, return connected: true with accounts and chainId
            sendResponse({
                connected: true,
                accounts: state.connectedSites[origin].accounts,
                chainId: state.connectedSites[origin].chainId
            });

            // Also highlight the extension to let user know of activity
            highlightExtensionIcon();

            return true;
        }

        // If no accounts, we can't connect (use mock accounts for testing)
        const accounts = state.accounts && state.accounts.length > 0
            ? state.accounts
            : ['0x0000000000000000000000000000000000000000']; // Mock account for testing

        if (accounts.length === 0) {
            console.log('No accounts available for connection');
            sendResponse({
                connected: false,
                error: {
                    message: 'No accounts available',
                    code: 4001
                }
            });
            return true;
        }

        // Create a new pending request
        const requestId = generateRequestId();
        state.pendingRequests[requestId] = {
            id: requestId,
            type: 'connect',
            origin,
            tabId: sender.tab.id,
            favicon: sender.tab.favIconUrl,
            accounts,
            chainId: state.selectedChainId,
            timestamp: Date.now()
        };

        console.log('Created pending connection request:', state.pendingRequests[requestId]);

        // Save state with new pending request
        saveState();

        // Open extension popup to approve the connection and highlight the icon
        highlightExtensionIcon();
        openPopupOrNotify(state.pendingRequests[requestId]);

        // Tell the dApp that their request is pending approval
        sendResponse({
            pending: true,
            requestId
        });

        return true;
    } catch (error) {
        console.error('Error handling connect request:', error);
        sendResponse({
            connected: false,
            error: {
                message: error.message || 'Connection request failed',
                code: 4001
            }
        });
        return true;
    }
}

// Handle eth_requestAccounts method
function handleRequestAccounts(message, sender, sendResponse) {
    try {
        const origin = message.origin;
        console.log(`Received eth_requestAccounts from origin: ${origin}`);

        // Check if site is already connected - if so, we can return accounts immediately without approval
        if (state.connectedSites[origin] &&
            state.connectedSites[origin].connected &&
            state.connectedSites[origin].accounts &&
            state.connectedSites[origin].accounts.length > 0) {

            console.log('Site already connected, returning accounts:', state.connectedSites[origin].accounts);

            // Always highlight the icon to show activity
            highlightExtensionIcon();

            // Return the accounts immediately
            sendResponse(state.connectedSites[origin].accounts);
            return;
        }

        // For ANY new connection, require user approval
        console.log('Site needs approval to connect - creating permission request');

        // Generate a unique ID for this request
        const requestId = generateRequestId();

        // Store the request in our pending requests
        state.pendingRequests[requestId] = {
            id: requestId,
            type: 'connect',
            origin: origin,
            timestamp: Date.now(),
            tabId: sender.tab ? sender.tab.id : null,
            // Include available accounts in the request for the UI to use
            availableAccounts: state.accounts
        };

        // Save request state
        saveState();

        // Open popup and highlight the icon
        openPopupOrNotify({
            type: 'connect',
            origin: origin,
            id: requestId
        });

        // Let the dApp know we need user approval
        sendResponse({
            pending: true,
            requestId,
            error: {
                code: 4001, // User rejected request (temporary, will be updated after user decision)
                message: "Waiting for user approval"
            }
        });
    } catch (error) {
        console.error('Error handling eth_requestAccounts:', error);
        sendResponse({
            error: {
                message: error.message || 'Error processing accounts request',
                code: 4001 // User rejected request
            }
        });
    }
}

// Handle connection approval
function handleConnectionApproval(message, sendResponse) {
    try {
        const { requestId, accounts } = message;

        // Find the request
        const request = state.pendingRequests[requestId];

        if (!request) {
            console.error('Connection approval error: Request not found', requestId);
            sendResponse({ success: false, error: { message: 'Request not found' } });
            return;
        }

        console.log('Approving connection request:', request);

        // Use the accounts selected by the user or fall back to the accounts in the request
        // If no accounts specified, use the available mock accounts
        const accountsToUse = accounts && accounts.length > 0
            ? accounts
            : (request.availableAccounts && request.availableAccounts.length > 0
                ? request.availableAccounts
                : (state.accounts.length > 0
                    ? state.accounts
                    : ['0xeA68d68857d1F8B3f2bCf540590cB9bbC6F2F5Cb']));

        console.log('Using accounts for connection:', accountsToUse);

        // Update connected sites
        state.connectedSites[request.origin] = {
            origin: request.origin,
            connected: true,
            accounts: accountsToUse,
            chainId: state.selectedChainId || '0x1', // Default to Ethereum Mainnet if no chain is selected
            permissions: ['eth_accounts'],
            timestamp: Date.now()
        };

        // Save state first
        saveState();
        saveConnectedSites();

        // Clean up the request
        delete state.pendingRequests[requestId];

        // Clean up from local storage too
        chrome.storage.local.remove('currentPendingRequest');

        // Try to send a message to the website's tab
        if (request.tabId) {
            try {
                // First, notify about successful connection
                chrome.tabs.sendMessage(request.tabId, {
                    type: 'RESPONSE',
                    requestId: request.id,
                    result: {
                        connected: true,
                        accounts: accountsToUse,
                        chainId: state.selectedChainId || '0x1'
                    }
                }, (tabResponse) => {
                    if (chrome.runtime.lastError) {
                        console.warn('Could not send connection response to tab:', chrome.runtime.lastError);
                    } else {
                        console.log('Successfully sent connection approval to tab');
                    }
                });

                // Next, send events to update the dApp's state
                // 1. connect event - critical for detection
                chrome.tabs.sendMessage(request.tabId, {
                    type: 'WALLET_EVENT',
                    event: 'connect',
                    data: {
                        chainId: state.selectedChainId || '0x1'
                    }
                });

                // 2. accountsChanged event
                chrome.tabs.sendMessage(request.tabId, {
                    type: 'WALLET_EVENT',
                    event: 'accountsChanged',
                    data: accountsToUse
                });

                // 3. chainChanged event
                chrome.tabs.sendMessage(request.tabId, {
                    type: 'WALLET_EVENT',
                    event: 'chainChanged',
                    data: state.selectedChainId || '0x1'
                });
            } catch (tabError) {
                console.error('Error sending message to tab:', tabError);
            }
        }

        // Always send a successful response back to the popup
        sendResponse({
            success: true,
            accounts: accountsToUse,
            chainId: state.selectedChainId || '0x1'
        });
    } catch (error) {
        console.error('Error in connection approval:', error);
        // Always send a response, even on error
        sendResponse({
            success: false,
            error: {
                message: error.message || 'Error processing connection approval'
            }
        });
    }
}

// Handle connection rejection
function handleConnectionRejection(message, sendResponse) {
    try {
        const { requestId } = message;

        // Find the request
        const request = state.pendingRequests[requestId];

        if (!request) {
            console.error('Connection rejection error: Request not found', requestId);
            sendResponse({ success: false, error: { message: 'Request not found' } });
            return;
        }

        console.log('Rejecting connection request:', request);

        // Try to send a message to the website's tab
        if (request.tabId) {
            try {
                chrome.tabs.sendMessage(request.tabId, {
                    type: 'RESPONSE',
                    requestId: request.id,
                    error: {
                        code: 4001, // User Rejected Request (EIP-1193)
                        message: 'User rejected the request.'
                    }
                }, (tabResponse) => {
                    if (chrome.runtime.lastError) {
                        console.warn('Could not send rejection response to tab:', chrome.runtime.lastError);
                    } else {
                        console.log('Successfully sent connection rejection to tab');
                    }
                });
            } catch (tabError) {
                console.error('Error sending rejection message to tab:', tabError);
            }
        }

        // Clean up the request
        delete state.pendingRequests[requestId];

        // Clean up from local storage too
        chrome.storage.local.remove('currentPendingRequest');

        // Send a successful response back to the popup
        sendResponse({ success: true });
    } catch (error) {
        console.error('Error in connection rejection:', error);
        // Always send a response, even on error
        sendResponse({
            success: false,
            error: {
                message: error.message || 'Error processing connection rejection'
            }
        });
    }
}

// Handle transaction request
function handleTransactionRequest(message, sender, sendResponse) {
    const { origin, requestId, transaction } = message;
    const tabId = sender.tab.id;

    console.log(`Transaction request from ${origin}`, transaction);

    // Check if site is connected
    if (!state.connectedSites[origin] || !state.connectedSites[origin].connected) {
        sendResponse({
            error: {
                code: 4100,
                message: 'Unauthorized: Please connect first'
            }
        });
        return;
    }

    // Create a new pending transaction request
    const request = {
        id: requestId,
        type: message.type === 'SIGN_TRANSACTION_REQUEST' ? 'sign' : 'send', // Distinguish sign vs send
        origin,
        tabId,
        transaction, // The raw transaction object from the dApp
        chainId: state.connectedSites[origin].chainId, // Get chainId from connection state
        timestamp: Date.now()
    };

    state.pendingRequests[requestId] = request;

    // Use the extension's popup to show the request instead of opening a new window
    openExtensionPopup(request);

    // Inform the content script that we're waiting for approval
    sendResponse({ pending: true });
}

// Handle transaction approval from the popup
async function handleTransactionApproval(message, sendResponse) {
    const { requestId } = message; // Popup sends the requestId

    // Retrieve the pending transaction details
    chrome.storage.local.get(['pendingTransaction', 'state'], async (result) => {
        const pendingTx = result.pendingTransaction;
        const currentState = result.state;

        if (!pendingTx || pendingTx.id !== requestId) {
            console.error('Transaction approval error: Request ID mismatch or not found');
            sendResponse({ success: false, error: 'Request not found or expired' });
            return;
        }

        // --- Security Placeholder: Decrypt Private Key ---
        // In a real wallet, retrieve the encrypted private key for the
        // relevant account (e.g., state.accounts[0].privateKey) and
        // decrypt it using the user's password.
        // const decryptedPrivateKey = await decryptKey(currentState.accounts[0].encryptedKey, userPassword);
        const decryptedPrivateKey = "0xYOUR_SECURELY_RETRIEVED_PRIVATE_KEY"; // Replace with secure retrieval
        if (!decryptedPrivateKey) {
            console.error('Transaction approval error: Could not get private key');
            sendResponse({ success: false, error: 'Failed to retrieve private key' });
            chrome.storage.local.remove('pendingTransaction'); // Clean up
            return;
        }
        // --- End Security Placeholder ---

        try {
            // --- Ethers.js Integration Placeholder ---
            // Ensure ethers.js is loaded or imported
            // const ethers = require('ethers'); // Or import if using modules

            // Get the correct provider RPC URL based on chainId
            // You'll need a mapping from chainId to RPC URL
            const rpcUrl = getRpcUrlForChain(pendingTx.chainId); // Implement getRpcUrlForChain
            if (!rpcUrl) throw new Error(`Unsupported chainId: ${pendingTx.chainId}`);

            const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
            const wallet = new ethers.Wallet(decryptedPrivateKey, provider);

            let txResponse;
            if (pendingTx.type === 'sign') {
                // TODO: Implement signing logic if needed separately
                // For now, assume approval means sending for simplicity
                console.warn('Signing-only not fully implemented, proceeding with send.');
                txResponse = await wallet.sendTransaction(pendingTx.transaction);
            } else {
                // Populate necessary fields if missing (optional, dApp should provide)
                const populatedTx = await wallet.populateTransaction(pendingTx.transaction);
                txResponse = await wallet.sendTransaction(populatedTx);
            }

            console.log('Transaction sent:', txResponse);

            // Send success response back to the content script
            if (pendingTx.tabId) {
                chrome.tabs.sendMessage(pendingTx.tabId, {
                    type: 'TRANSACTION_RESPONSE', // Use a generic response type
                    requestId: pendingTx.id,
                    approved: true,
                    result: txResponse.hash // Send back the transaction hash
                });
            }
            sendResponse({ success: true, txHash: txResponse.hash });
            // --- End Ethers.js Integration Placeholder ---

        } catch (error) {
            console.error('Transaction failed:', error);
            // Send error response back to the content script
            if (pendingTx.tabId) {
                chrome.tabs.sendMessage(pendingTx.tabId, {
                    type: 'TRANSACTION_RESPONSE',
                    requestId: pendingTx.id,
                    approved: false,
                    error: { code: -32000, message: error.message || 'Transaction failed' }
                });
            }
            sendResponse({ success: false, error: error.message || 'Transaction failed' });
        } finally {
            // Clean up the pending transaction from storage
            chrome.storage.local.remove('pendingTransaction');
        }
    });

    return true; // Indicate async response
}

// Handle transaction rejection from the popup
function handleTransactionRejection(message, sendResponse) {
    const { requestId } = message;

    chrome.storage.local.get('pendingTransaction', (result) => {
        const pendingTx = result.pendingTransaction;

        if (!pendingTx || pendingTx.id !== requestId) {
            console.error('Transaction rejection error: Request ID mismatch or not found');
            sendResponse({ success: false, error: 'Request not found or expired' });
            return;
        }

        console.log('Transaction rejected by user:', requestId);

        // Notify the content script of the rejection
        if (pendingTx.tabId) {
            chrome.tabs.sendMessage(pendingTx.tabId, {
                type: 'TRANSACTION_RESPONSE',
                requestId: pendingTx.id,
                approved: false,
                error: { code: 4001, message: 'User rejected the transaction' }
            });
        }

        // Clean up the pending transaction
        chrome.storage.local.remove('pendingTransaction', () => {
            sendResponse({ success: true });
        });
    });

    return true; // Indicate async response
}

// Handle chain changed event
function handleChainChanged(chainId, sendResponse) {
    state.selectedChainId = chainId;
    saveState();

    // Notify all connected sites about the chain change
    for (const origin in state.connectedSites) {
        if (state.connectedSites[origin].connected) {
            state.connectedSites[origin].chainId = chainId;

            notifyConnectedTabs(origin, {
                type: 'WALLET_EVENT',
                event: 'chainChanged',
                data: chainId
            });
        }
    }

    saveConnectedSites();
    sendResponse({ success: true });
}

// Handle site disconnection
function handleSiteDisconnected(message, sendResponse) {
    const { origin } = message;

    if (state.connectedSites[origin]) {
        state.connectedSites[origin].connected = false;
        saveConnectedSites();

        // Notify the site about disconnection
        notifyConnectedTabs(origin, {
            type: 'WALLET_EVENT',
            event: 'disconnect',
            data: { message: 'Wallet disconnected' }
        });

        sendResponse({ success: true });
    } else {
        sendResponse({ error: 'Site not found in connected sites' });
    }
}

// Get RPC URL for a specific chain
function getRpcUrlForChain(chainId) {
    // Default RPC URLs for various chains
    // In production, you should use your own infrastructure or paid APIs
    const rpcUrls = {
        '0x1': 'https://eth-mainnet.g.alchemy.com/v2/demo',
        '0x5': 'https://eth-goerli.g.alchemy.com/v2/demo',
        '0x89': 'https://polygon-mainnet.g.alchemy.com/v2/demo',
        '0x13881': 'https://polygon-mumbai.g.alchemy.com/v2/demo',
        '0xa': 'https://opt-mainnet.g.alchemy.com/v2/demo',
        '0x38': 'https://bsc-dataseed.binance.org',
        '0xa4b1': 'https://arb-mainnet.g.alchemy.com/v2/demo',
        '0xaa36a7': 'https://eth-sepolia.g.alchemy.com/v2/demo'
    };

    return rpcUrls[chainId] || rpcUrls['0x1']; // Default to Ethereum mainnet
}

// Save state to storage
function saveState() {
    // Don't save pendingRequests to avoid bloating storage
    const stateToSave = {
        isUnlocked: state.isUnlocked,
        accounts: state.accounts,
        selectedChainId: state.selectedChainId,
        connectedSites: state.connectedSites,
        walletConnectSessions: state.walletConnectSessions
    };

    chrome.storage.local.set({ state: stateToSave });
}

// Save connected sites to storage
function saveConnectedSites() {
    chrome.storage.local.set({ connectedSites: state.connectedSites });
}

// Save WalletConnect sessions to storage
function saveWalletConnectSessions() {
    chrome.storage.local.set({ walletConnectSessions: state.walletConnectSessions });
}

// Notify all tabs with the same origin
function notifyConnectedTabs(origin, message) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            if (tab.url && tab.url.includes(origin)) {
                chrome.tabs.sendMessage(tab.id, message);
            }
        });
    });
}

// WalletConnect Handlers

// Handle WalletConnect initialization
function handleWalletConnectInit(message, sendResponse) {
    // Placeholder for WalletConnect initialization
    console.log('WalletConnect initialization request received', message);
    sendResponse({ success: true });
}

// Handle WalletConnect session request
function handleWalletConnectSessionRequest(message, sendResponse) {
    const { uri, requestId } = message;

    if (!uri) {
        sendResponse({ error: 'WalletConnect URI is missing' });
        return;
    }

    // Create a pending request for the WalletConnect session
    const request = {
        id: requestId || `wc_${Date.now()}`,
        type: 'walletconnect_session',
        uri,
        timestamp: Date.now()
    };

    // Add to pending requests
    state.pendingRequests[requestId] = request;
    saveState();

    // Open a popup to display the WalletConnect approval
    chrome.windows.create({
        url: chrome.runtime.getURL(`index.html?requestType=walletconnect&requestId=${request.id}`),
        type: 'popup',
        width: 400,
        height: 600
    });

    sendResponse({ success: true, requestId: request.id });
}

// Handle WalletConnect session approval
function handleWalletConnectApproveSession(message, sendResponse) {
    const { requestId, accounts, chainId } = message;

    // Find the request
    const request = state.pendingRequests[requestId];

    if (!request) {
        sendResponse({ error: 'WalletConnect request not found' });
        return;
    }

    // Create a new WalletConnect session
    const session = {
        id: Date.now().toString(),
        uri: request.uri,
        accounts: accounts || state.accounts,
        chainId: chainId || state.selectedChainId,
        connected: true,
        timestamp: Date.now()
    };

    // Add to WalletConnect sessions
    state.walletConnectSessions.push(session);
    saveWalletConnectSessions();

    // Send response to the popup
    sendResponse({ success: true, session });

    // Broadcasting to content scripts would be done via additional messages
}

// Handle WalletConnect session rejection
function handleWalletConnectRejectSession(message, sendResponse) {
    const { requestId } = message;

    // Find the request
    const request = state.pendingRequests[requestId];

    if (!request) {
        sendResponse({ error: 'WalletConnect request not found' });
        return;
    }

    // Remove the request
    delete state.pendingRequests[requestId];
    saveState();

    sendResponse({ success: true });
}

// Handle WalletConnect call request
function handleWalletConnectCallRequest(message, sendResponse) {
    const { sessionId, request, requestId } = message;

    // Find the session
    const session = state.walletConnectSessions.find(s => s.id === sessionId);

    if (!session) {
        sendResponse({ error: 'WalletConnect session not found' });
        return;
    }

    // Add to pending requests
    const pendingRequest = {
        id: requestId || `wc_call_${Date.now()}`,
        type: 'walletconnect_call',
        sessionId,
        request,
        timestamp: Date.now()
    };

    state.pendingRequests[requestId] = pendingRequest;
    saveState();

    // Open a popup to handle the request
    chrome.windows.create({
        url: chrome.runtime.getURL(`index.html?requestType=walletconnect_call&requestId=${pendingRequest.id}`),
        type: 'popup',
        width: 400,
        height: 600
    });

    sendResponse({ success: true, requestId: pendingRequest.id });
}

// Handle WalletConnect call approval
function handleWalletConnectApproveCallRequest(message, sendResponse) {
    const { requestId, result } = message;

    // Find the request
    const request = state.pendingRequests[requestId];

    if (!request) {
        sendResponse({ error: 'WalletConnect call request not found' });
        return;
    }

    // Send result back to the content script
    // This would normally involve sending a message to the content script
    // which would then relay it to the WalletConnect client

    sendResponse({ success: true, result });
}

// Handle WalletConnect call rejection
function handleWalletConnectRejectCallRequest(message, sendResponse) {
    const { requestId, error } = message;

    // Find the request
    const request = state.pendingRequests[requestId];

    if (!request) {
        sendResponse({ error: 'WalletConnect call request not found' });
        return;
    }

    // Send error back to the content script

    sendResponse({ success: true });
}

// Handle WalletConnect disconnection
function handleWalletConnectDisconnect(message, sendResponse) {
    const { sessionId } = message;

    // Find the session
    const sessionIndex = state.walletConnectSessions.findIndex(s => s.id === sessionId);

    if (sessionIndex === -1) {
        sendResponse({ error: 'WalletConnect session not found' });
        return;
    }

    // Remove the session
    state.walletConnectSessions.splice(sessionIndex, 1);
    saveWalletConnectSessions();

    // Send response
    sendResponse({ success: true });
}

// Open extension popup or show notification for pending requests
function openPopupOrNotify(request) {
    console.log('Opening extension popup or showing notification for request:', request);

    try {
        // Store the current request ID so the popup knows which request to display
        chrome.storage.local.set({ 'currentPendingRequest': request }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error saving current request:', chrome.runtime.lastError);
            }
        });

        // First, try to open a proper extension popup
        if (chrome.browserAction && chrome.browserAction.openPopup) {
            // If the browser supports direct popup opening (Chrome does in MV3)
            try {
                chrome.browserAction.openPopup(() => {
                    if (chrome.runtime.lastError) {
                        console.log('Direct popup open failed, trying alternative method');
                        openPopupAlternative(request);
                    }
                });
                return;
            } catch (e) {
                console.log('Direct popup open not supported, trying alternative method');
                openPopupAlternative(request);
            }
        } else {
            // If direct method not available, use alternative
            openPopupAlternative(request);
        }
    } catch (error) {
        console.error('Error in openPopupOrNotify:', error);
        // Fallback to notifications
        highlightExtensionIcon();
        showRequestNotification(request);
    }
}

// Alternative methods to open the popup if direct method fails
function openPopupAlternative(request) {
    // First, try to focus any existing popup window
    chrome.windows.getAll({ populate: true }, (windows) => {
        let popupFound = false;

        // Check if we have any popup windows already open
        for (const window of windows) {
            for (const tab of window.tabs || []) {
                if (tab.url && tab.url.includes(chrome.runtime.id)) {
                    console.log('Found existing popup, focusing it');
                    popupFound = true;

                    // Focus the window with the popup
                    chrome.windows.update(window.id, { focused: true });

                    // Notify the popup about the new request
                    chrome.runtime.sendMessage({
                        type: 'NEW_PENDING_REQUEST',
                        request: request
                    });

                    return;
                }
            }
        }

        // If no popup is open, create a new popup window
        if (!popupFound) {
            console.log('Creating new popup window');

            const popupURL = chrome.runtime.getURL('index.html?requestId=' +
                (request ? request.id : '') + '&requestType=' +
                (request ? request.type : 'connect'));

            chrome.windows.create({
                url: popupURL,
                type: 'popup',
                width: 400,
                height: 600,
                focused: true
            }, function (popupWindow) {
                if (chrome.runtime.lastError) {
                    console.error('Failed to create popup window:', chrome.runtime.lastError);
                    // As last resort, highlight icon and show notification
                    highlightExtensionIcon();
                    showRequestNotification(request);
                }
            });
        }
    });
}

// Highlight the extension icon to get user attention
function highlightExtensionIcon() {
    try {
        console.log('Highlighting extension icon');

        // Use browserAction API to set icon to highlighted version
        if (chrome.browserAction) {
            chrome.browserAction.setIcon({ path: 'icon_highlight.svg' });

            // Reset after 2 seconds
            setTimeout(() => {
                chrome.browserAction.setIcon({ path: 'icon.svg' });
            }, 2000);
        }
    } catch (error) {
        console.error('Error highlighting icon:', error);
    }
}

// Show notification for pending request
function showRequestNotification(request) {
    try {
        const req = request || Object.values(state.pendingRequests)[0];
        if (!req) return;

        let title = '';
        let message = '';

        // Determine notification content based on request type
        if (req.type === 'connect') {
            title = 'Connection Request';
            message = `${req.origin} wants to connect to your wallet`;
        } else if (req.type === 'transaction') {
            title = 'Transaction Request';
            message = `${req.origin} wants to send a transaction`;
        } else if (req.type === 'sign') {
            title = 'Signing Request';
            message = `${req.origin} wants you to sign a message`;
        } else if (req.type === 'add_chain') {
            title = 'Add Chain Request';
            message = `${req.origin} wants to add a new blockchain network`;
        } else if (req.type === 'watch_asset') {
            title = 'Add Token Request';
            message = `${req.origin} wants to add a token to your wallet`;
        } else {
            title = 'Wallet Request';
            message = `${req.origin} requires your attention`;
        }

        // Create and show notification
        chrome.notifications.create(`request_${req.id}`, {
            type: 'basic',
            iconUrl: 'icon.svg',
            title: title,
            message: message,
            priority: 2,
            buttons: [
                { title: 'Open Wallet' }
            ]
        });

        // Store request ID to handle click
        state.currentNotificationRequest = req.id;

        // Handle notification click
        chrome.notifications.onClicked.addListener(function notificationClickListener(notificationId) {
            if (notificationId.startsWith('request_')) {
                // Open extension popup
                chrome.browserAction.openPopup();
                // Clean up listener
                chrome.notifications.onClicked.removeListener(notificationClickListener);
            }
        });

        // Handle button click
        chrome.notifications.onButtonClicked.addListener(function buttonClickListener(notificationId, buttonIndex) {
            if (notificationId.startsWith('request_')) {
                // Button index 0 is "Open Wallet"
                if (buttonIndex === 0) {
                    chrome.browserAction.openPopup();
                }
                // Clean up listener
                chrome.notifications.onButtonClicked.removeListener(buttonClickListener);
            }
        });
    } catch (error) {
        console.error('Error showing notification:', error);
    }
}

// Get the current state for a site
function handleGetState(message, origin, sendResponse) {
    // This is a read operation, so we can filter what we return
    const filteredState = {
        isUnlocked: state.isUnlocked,
        selectedChainId: state.selectedChainId,
        connectedSites: state.connectedSites
    };

    sendResponse({ state: filteredState });
}

// Get all pending requests
function getPendingRequests(sendResponse) {
    console.log('Getting pending requests', state.pendingRequests);
    const pendingRequestsArray = Object.values(state.pendingRequests);
    sendResponse({ pendingRequests: pendingRequestsArray });
}

// Listen for Chrome notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
    // Open the extension popup when notification is clicked
    if (chrome.action) {
        chrome.action.openPopup();
    } else if (chrome.browserAction) {
        chrome.browserAction.openPopup();
    }
});

// Handle Web3 JSON-RPC requests
async function handleWeb3Request(message, sender, sendResponse) {
    try {
        const { method, params, origin } = message;
        console.log(`Received Web3 request: ${method}`, { params, origin });

        // If this method requires approval, handle it specifically
        if (method === 'eth_requestAccounts') {
            return handleRequestAccounts(message, sender, sendResponse);
        }

        if (method === 'wallet_switchEthereumChain') {
            const chainId = params[0]?.chainId;
            if (!chainId) {
                sendResponse({
                    error: {
                        code: 4000,
                        message: 'Invalid chainId parameter'
                    }
                });
                return;
            }

            console.log(`Handling switch chain request to: ${chainId}`);
            // Call the switch chain handler with the chainId from params
            return handleSwitchChain({
                chainId: chainId,
                origin: origin
            }, sender, sendResponse);
        }

        if (method === 'wallet_addEthereumChain') {
            return handleAddChain(message, sender, sendResponse);
        }

        if (method === 'wallet_watchAsset') {
            return handleWatchAsset(message, sender, sendResponse);
        }

        // For eth_accounts, check if the site is connected
        if (method === 'eth_accounts') {
            const connectedSite = state.connectedSites[origin];
            if (connectedSite && connectedSite.connected) {
                console.log('Site is connected, returning accounts:', connectedSite.accounts);
                sendResponse(connectedSite.accounts);
            } else {
                console.log('Site is not connected, returning empty accounts array');
                sendResponse([]);
            }
            return;
        }

        // For eth_chainId, return the currently selected chain
        if (method === 'eth_chainId') {
            console.log('Returning chainId:', state.selectedChainId || '0x1');
            sendResponse(state.selectedChainId || '0x1');
            return;
        }

        // For methods that require a user to sign something
        if (method.startsWith('eth_sign') || method.startsWith('personal_sign') || method === 'eth_sendTransaction') {
            return handleSigningRequest(message, sender, sendResponse);
        }

        // For read-only methods, forward to RPC provider
        const readOnlyMethods = [
            'eth_blockNumber', 'eth_call', 'eth_estimateGas', 'eth_gasPrice',
            'eth_getBalance', 'eth_getBlockByHash', 'eth_getBlockByNumber',
            'eth_getCode', 'eth_getFilterChanges', 'eth_getLogs',
            'eth_getStorageAt', 'eth_getTransactionByHash',
            'eth_getTransactionCount', 'eth_getTransactionReceipt',
            'net_version', 'web3_clientVersion'
        ];

        if (readOnlyMethods.includes(method)) {
            return forwardToRpcProviderAndRespond(method, params, sendResponse);
        }

        // For any other methods not handled, return an error
        console.warn(`Method ${method} not supported`);
        sendResponse({
            error: {
                code: -32601,
                message: `Method ${method} not supported`
            }
        });

    } catch (error) {
        console.error('Error handling Web3 request:', error);
        sendResponse({
            error: {
                code: -32603,
                message: error.message || 'Internal error processing request'
            }
        });
    }
}

// Fetch balance from RPC provider
async function fetchBalanceAndRespond(address, origin, sendResponse) {
    try {
        const chainId = state.connectedSites[origin]?.chainId || state.selectedChainId || '0x1';
        const rpcUrl = getRpcUrlForChain(chainId);

        // Prepare the JSON-RPC request
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_getBalance',
                params: [address, 'latest']
            })
        });

        const data = await response.json();

        if (data.error) {
            sendResponse({
                error: data.error
            });
        } else {
            sendResponse(data.result);
        }
    } catch (error) {
        console.error('Error fetching balance:', error);
        sendResponse({
            error: {
                code: 4000,
                message: 'Failed to fetch balance'
            }
        });
    }
}

// Forward request to RPC provider and send response back
async function forwardToRpcProviderAndRespond(method, params, sendResponse) {
    try {
        const rpcUrl = getRpcUrlForChain(state.selectedChainId || '0x1');
        console.log(`Forwarding ${method} to RPC provider: ${rpcUrl}`);

        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: Date.now(),
                method,
                params
            })
        });

        if (!response.ok) {
            throw new Error(`RPC request failed with status: ${response.status}`);
        }

        const result = await response.json();
        console.log('RPC provider response:', result);

        if (result.error) {
            sendResponse({
                error: result.error
            });
        } else {
            sendResponse(result.result);
        }
    } catch (error) {
        console.error(`Error forwarding ${method} to RPC provider:`, error);

        // For eth_call specifically, return a more graceful error
        if (method === 'eth_call') {
            sendResponse({
                error: {
                    code: -32603,
                    message: 'Error executing eth_call: RPC provider unavailable'
                }
            });
            return;
        }

        sendResponse({
            error: {
                code: -32603,
                message: error.message || `Error forwarding request to RPC provider`
            }
        });
    }
}

// Handle switching between chains (like Mainnet, Polygon, etc)
function handleSwitchChain(message, sender, sendResponse) {
    try {
        console.log('Switch chain request:', message);
        const { chainId } = message;
        const origin = message.origin;

        if (!chainId) {
            throw new Error('Invalid chainId parameter');
        }

        // Define supported chains
        const supportedChains = [
            '0x1',     // Ethereum Mainnet
            '0x5',     // Goerli
            '0x89',    // Polygon
            '0x13881', // Mumbai (Polygon Testnet)
            '0xa',     // Optimism
            '0x38',    // BSC
            '0xa4b1',  // Arbitrum
            '0xaa36a7' // Sepolia
        ];

        // Check if chain is supported
        if (!supportedChains.includes(chainId)) {
            console.log(`Chain ${chainId} is not supported`);
            sendResponse({
                error: {
                    code: 4902, // Chain not added
                    message: `Chain with ID ${chainId} is not supported by this wallet`
                }
            });
            return true;
        }

        // Update selected chain
        state.selectedChainId = chainId;
        saveState();

        console.log(`Switched to chain: ${chainId}`);

        // If this site is connected, update its chainId too
        if (state.connectedSites[origin]) {
            state.connectedSites[origin].chainId = chainId;
            saveConnectedSites();
        }

        // Notify all tabs about the chain change
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                try {
                    // Only notify tabs for this origin if possible
                    if (tab.url) {
                        const tabOrigin = new URL(tab.url).origin;
                        if (tabOrigin === origin || !origin) {
                            chrome.tabs.sendMessage(tab.id, {
                                type: 'WALLET_EVENT',
                                event: 'chainChanged',
                                data: chainId
                            });
                        }
                    }
                } catch (error) {
                    console.log('Error processing tab for chain notification:', error);
                }
            });
        });

        // Send success response - this is important!
        console.log('Sending successful chainId switch response');
        sendResponse(null); // Success response is just null for this method
        return true;
    } catch (error) {
        console.error('Error handling chain switch:', error);
        sendResponse({
            error: {
                code: 4901, // Chain disconnected
                message: error.message || 'Failed to switch chain'
            }
        });
        return true;
    }
}

// Handle adding custom chain
function handleAddChain(message, sender, sendResponse) {
    try {
        const { chainParams, origin } = message;

        // Validate chain parameters
        if (!chainParams.chainId || !chainParams.chainName || !chainParams.rpcUrls || chainParams.rpcUrls.length === 0) {
            sendResponse({
                error: {
                    code: 4000,
                    message: 'Invalid chain parameters'
                }
            });
            return true;
        }

        // See if chain already exists
        const existingChainIndex = state.supportedChains.findIndex(chain => chain.chainId === chainParams.chainId);

        if (existingChainIndex >= 0) {
            // Chain already exists, just switch to it
            return handleSwitchChain({
                chainId: chainParams.chainId,
                origin
            }, sender, sendResponse);
        }

        // Create a pending request for the user to approve adding this chain
        const requestId = generateRequestId();
        state.pendingRequests[requestId] = {
            id: requestId,
            type: 'add_chain',
            origin,
            tabId: sender.tab?.id,
            chainParams,
            timestamp: Date.now()
        };

        saveState();

        // Open extension popup to approve the chain addition
        openPopupOrNotify();

        // Tell the dApp that their request is pending approval
        sendResponse({
            pending: true,
            requestId
        });

        return true;
    } catch (error) {
        console.error('Error adding chain:', error);
        sendResponse({
            error: {
                code: 4000,
                message: error.message || 'Error adding chain'
            }
        });
        return true;
    }
}

// Handle adding custom token
function handleWatchAsset(message, sender, sendResponse) {
    try {
        const { asset, origin } = message;

        // Validate asset parameters
        if (!asset || !asset.type || asset.type !== 'ERC20' || !asset.options ||
            !asset.options.address || !asset.options.symbol || !asset.options.decimals) {
            sendResponse({
                error: {
                    code: 4000,
                    message: 'Invalid token parameters'
                }
            });
            return true;
        }

        // Create a pending request for the user to approve adding this token
        const requestId = generateRequestId();
        state.pendingRequests[requestId] = {
            id: requestId,
            type: 'watch_asset',
            origin,
            tabId: sender.tab?.id,
            asset,
            timestamp: Date.now()
        };

        saveState();

        // Open extension popup to approve the token addition
        openPopupOrNotify();

        // Tell the dApp that their request is pending approval
        sendResponse({
            pending: true,
            requestId
        });

        return true;
    } catch (error) {
        console.error('Error watching asset:', error);
        sendResponse({
            error: {
                code: 4000,
                message: error.message || 'Error watching asset'
            }
        });
        return true;
    }
}

// Handle signing request
function handleSigningRequest(message, sender, sendResponse) {
    try {
        const { method, params, origin, tabId } = message;

        // Create a pending request for the user to approve signing
        const requestId = generateRequestId();
        state.pendingRequests[requestId] = {
            id: requestId,
            type: 'sign',
            method,
            params,
            origin,
            tabId: tabId || sender.tab?.id,
            timestamp: Date.now()
        };

        saveState();

        // Open extension popup to approve the signing request
        openPopupOrNotify();

        // Tell the dApp that their request is pending approval
        sendResponse({
            pending: true,
            requestId
        });

        return true;
    } catch (error) {
        console.error('Error handling signing request:', error);
        sendResponse({
            error: {
                code: 4000,
                message: error.message || 'Error handling signing request'
            }
        });
        return true;
    }
}

// Generate a unique request ID
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
} 