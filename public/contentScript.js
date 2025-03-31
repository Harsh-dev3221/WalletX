/**
 * Cross-Net Wallet Content Script
 * 
 * Acts as a bridge between the webpage and the extension's background script.
 * This script:
 * 1. Injects the wallet provider into web pages
 * 2. Relays messages between the injected script and background script
 * 3. Handles requests and responses for transactions and connections
 * 4. Maintains connection state for the current site
 */

console.log('Cross-Net Wallet content script loaded');

// Site information
const origin = window.location.origin;
let connected = false;
let accounts = [];
let chainId = null;

// Track injection status
let providerInjected = false;

// Inject the provider script into the web page
function injectScript() {
    try {
        console.log('Cross-Net Wallet: Injecting provider script');

        // Check if already injected to prevent duplicate injections
        if (document.querySelector('script[data-crossnet-injected="true"]') || providerInjected) {
            console.log('Cross-Net Wallet: Provider already injected, skipping');
            return true;
        }

        // Mark as injected to avoid duplicate attempts
        providerInjected = true;

        // Create a script element to inject our code
        const script = document.createElement('script');
        script.setAttribute('data-crossnet-injected', 'true');
        script.setAttribute('data-crossnet-injected-at', Date.now().toString());

        // Get the URL of the inject script from the extension
        script.src = chrome.runtime.getURL('injectScript.js');

        // Setting this to ensure the script is loaded and executed before the page continues loading
        script.onload = function () {
            console.log('Cross-Net Wallet provider injected successfully');
            // Dispatch an event to notify the page about wallet provider
            document.dispatchEvent(new CustomEvent('walletProviderInjected'));
        };

        // Inject into the document as early as possible
        (document.head || document.documentElement).appendChild(script);

        // Also set a flag in the document for the page to detect
        document.documentElement.setAttribute('data-crossnet-wallet', 'true');

        return true;
    } catch (error) {
        console.error('Failed to inject provider script:', error);
        providerInjected = false;

        // We'll return false so the caller knows to try again
        return false;
    }
}

// Priority injection - try immediately before other code runs
if (!injectScript()) {
    // If initial injection failed, try a second time with a small delay
    setTimeout(() => {
        if (!injectScript()) {
            console.log('Cross-Net Wallet: Scheduling additional injection attempts');

            // If first two attempts failed, try again when document begins to load
            document.addEventListener('readystatechange', () => {
                if (!providerInjected) {
                    injectScript();
                }
            });

            // Final fallback - try once more when DOM is fully loaded
            document.addEventListener('DOMContentLoaded', () => {
                if (!providerInjected) {
                    console.log('Cross-Net Wallet: DOM loaded, ensuring injection');
                    injectScript();
                }
            });
        }
    }, 50);
}

// Listen for messages from the injected script
window.addEventListener('message', async function (event) {
    // Only accept messages from our window
    if (event.source !== window) return;

    const message = event.data;

    // Ignore our own response messages to prevent loops
    if (message && (message.type === 'CROSS_NET_WALLET_RESPONSE' ||
        message.type === 'CROSS_NET_WALLET_EVENT' ||
        message.type === 'CROSS_NET_WALLET_TRANSACTION_RESPONSE' ||
        message.type === 'CROSSNET_WEB3_RESPONSE')) {
        return;
    }

    // Process messages from the page
    if (message && message.type) {
        console.log('Content script received message:', message);

        try {
            // Handle the different message types
            switch (message.type) {
                case 'CROSS_NET_WALLET_CONNECT':
                    // The page is requesting to connect to the wallet
                    await handleConnectRequest(message);
                    break;

                case 'CROSS_NET_WALLET_REQUEST':
                case 'CROSSNET_WEB3_REQUEST': // Add support for this message type
                    // The page is making a Web3 method call
                    const request = message.request || {
                        method: message.method || message.request?.method,
                        params: message.params || message.request?.params || []
                    };
                    await handleWeb3Request({
                        ...message,
                        method: request.method,
                        params: request.params
                    });
                    break;

                default:
                    console.log('Unknown message type received:', message.type);
                    // Send error response back to the page
                    window.postMessage({
                        type: 'CROSS_NET_WALLET_RESPONSE',
                        requestId: message.requestId,
                        response: {
                            error: {
                                message: `Unknown message type: ${message.type}`,
                                code: -32601
                            }
                        }
                    }, '*');
            }
        } catch (error) {
            console.error('Error processing message:', error);

            // Send error back to the page
            if (message.requestId) {
                window.postMessage({
                    type: 'CROSS_NET_WALLET_RESPONSE',
                    requestId: message.requestId,
                    response: {
                        error: {
                            message: error.message || 'Error processing request',
                            code: -32603
                        }
                    }
                }, '*');
            }
        }
    }
});

// Handle connection requests from the page
async function handleConnectRequest(message) {
    try {
        // Add origin information to the message
        const requestWithOrigin = {
            ...message,
            type: 'CONNECT_REQUEST',
            origin: origin
        };

        console.log('Sending connection request to background:', requestWithOrigin);

        // Send to the background script with timeout handling
        const response = await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Connection request timed out after 15 seconds'));
            }, 15000);

            chrome.runtime.sendMessage(requestWithOrigin, (response) => {
                clearTimeout(timeoutId);
                if (chrome.runtime.lastError) {
                    console.error('Error sending connection request:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                resolve(response || { error: { message: 'Empty response received from background' } });
            });
        });

        console.log('Connection response from background:', response);

        // If already connected, update local state
        if (response && response.connected) {
            connected = true;
            accounts = response.accounts || [];
            chainId = response.chainId;
        }

        // Send response back to the page
        window.postMessage({
            type: 'CROSS_NET_WALLET_RESPONSE',
            requestId: message.requestId,
            response: response
        }, '*');
    } catch (error) {
        console.error('Connection request error:', error);

        // Send error back to the page
        window.postMessage({
            type: 'CROSS_NET_WALLET_RESPONSE',
            requestId: message.requestId,
            response: {
                error: {
                    message: error.message || 'Failed to connect to wallet',
                    code: -32603
                }
            }
        }, '*');
    }
}

// Handle Web3 method calls (transactions, signing, etc.)
async function handleWeb3Request(message) {
    try {
        // Get the method and params from the message
        const { method, params, requestId, type } = message;

        console.log(`Web3 request: ${method}`, params);

        // Determine the response type based on the request type
        const responseType = type === 'CROSSNET_WEB3_REQUEST' ? 'CROSSNET_WEB3_RESPONSE' : 'CROSS_NET_WALLET_RESPONSE';

        // Special handling for chain switching methods
        if (method === 'wallet_switchEthereumChain') {
            console.log('Handling wallet_switchEthereumChain request:', params);

            try {
                // Send to background script
                const response = await sendBackgroundMessage({
                    type: 'WEB3_REQUEST',
                    method: 'wallet_switchEthereumChain',
                    params,
                    origin
                });

                console.log('Chain switch response:', response);

                // If we received a successful null response (as per EIP-1193)
                if (response === null) {
                    // Send successful response to page
                    window.postMessage({
                        type: responseType,
                        requestId,
                        response: null,
                        result: null // For chain switch, null response means success
                    }, '*');
                } else if (response && response.error) {
                    // Handle error response
                    window.postMessage({
                        type: responseType,
                        requestId,
                        response: {
                            error: response.error
                        },
                        error: response.error
                    }, '*');
                } else {
                    // Handle any other response
                    window.postMessage({
                        type: responseType,
                        requestId,
                        response: response || null,
                        result: response || null
                    }, '*');
                }
            } catch (error) {
                console.error('Error handling chain switch:', error);
                window.postMessage({
                    type: responseType,
                    requestId,
                    response: {
                        error: {
                            code: 4901, // Chain disconnected
                            message: error.message || 'Failed to switch chain'
                        }
                    },
                    error: {
                        code: 4901,
                        message: error.message || 'Failed to switch chain'
                    }
                }, '*');
            }
            return;
        }

        // Special handling for eth_accounts
        if (method === 'eth_accounts') {
            console.log('Handling eth_accounts request');

            // First check if we have accounts locally
            if (connected && accounts && accounts.length > 0) {
                console.log('Returning locally cached accounts:', accounts);
                window.postMessage({
                    type: responseType,
                    requestId,
                    response: accounts,
                    result: accounts // Include both for compatibility
                }, '*');
                return;
            }

            // If not connected locally but we might be connected in background
            try {
                // Check with background script for connected accounts
                const result = await sendBackgroundMessage({
                    type: 'WEB3_REQUEST',
                    method: 'eth_accounts',
                    params: [],
                    origin
                });

                console.log('eth_accounts response from background:', result);

                // Update local state if accounts were returned
                if (Array.isArray(result) && result.length > 0) {
                    connected = true;
                    accounts = result;
                }

                // Return either the accounts or empty array
                window.postMessage({
                    type: responseType,
                    requestId,
                    response: Array.isArray(result) ? result : [],
                    result: Array.isArray(result) ? result : [] // Include both for compatibility
                }, '*');
            } catch (error) {
                console.error('Error fetching accounts from background:', error);
                // Fallback to default account or empty array
                window.postMessage({
                    type: responseType,
                    requestId,
                    response: connected ? accounts : [],
                    result: connected ? accounts : [] // Include both for compatibility
                }, '*');
            }
            return;
        }

        // Special handling for eth_chainId
        if (method === 'eth_chainId') {
            console.log('Handling eth_chainId request');
            // Default to Ethereum mainnet if no chain is selected
            const currentChainId = chainId || '0x1';
            window.postMessage({
                type: responseType,
                requestId,
                response: currentChainId,
                result: currentChainId // Include both for compatibility
            }, '*');
            return;
        }

        // Special handling for eth_requestAccounts
        if (method === 'eth_requestAccounts') {
            console.log('Handling eth_requestAccounts request');

            // If already connected, return accounts immediately
            if (connected && accounts.length > 0) {
                console.log('Already connected, returning accounts:', accounts);
                window.postMessage({
                    type: responseType,
                    requestId,
                    response: accounts,
                    result: accounts // Include both for compatibility
                }, '*');
                return;
            }

            // Otherwise, start connection flow via a special connect request
            try {
                const connectResponse = await sendBackgroundMessage({
                    type: 'WEB3_REQUEST',
                    method: 'eth_requestAccounts',
                    params: [],
                    origin: origin,
                    requestId: `connect_${requestId}`
                });

                console.log('Connection response for eth_requestAccounts:', connectResponse);

                if (connectResponse && Array.isArray(connectResponse)) {
                    // Got accounts directly
                    connected = true;
                    accounts = connectResponse;
                    chainId = chainId || '0x1';

                    // Return the accounts to fulfill eth_requestAccounts
                    window.postMessage({
                        type: responseType,
                        requestId,
                        response: accounts,
                        result: accounts // Include both for compatibility
                    }, '*');
                } else if (connectResponse && connectResponse.accounts) {
                    // Got connection info object
                    connected = true;
                    accounts = connectResponse.accounts;
                    chainId = connectResponse.chainId || chainId || '0x1';

                    // Return the accounts
                    window.postMessage({
                        type: responseType,
                        requestId,
                        response: accounts,
                        result: accounts // Include both for compatibility
                    }, '*');
                } else if (connectResponse && connectResponse.pending) {
                    // Request is pending approval, will be handled by approval flow
                    console.log('Connection is pending approval');
                    // We still need to send a response to let the page know we received the request
                    window.postMessage({
                        type: responseType,
                        requestId,
                        response: { pending: true },
                        result: { pending: true } // Include both for compatibility
                    }, '*');
                } else if (connectResponse && connectResponse.error) {
                    // Error in the connect response
                    throw new Error(connectResponse.error.message || 'Connection failed');
                } else {
                    throw new Error('Connection failed');
                }
            } catch (error) {
                console.error('eth_requestAccounts error:', error);
                window.postMessage({
                    type: responseType,
                    requestId,
                    response: {
                        error: {
                            message: error.message || 'Failed to get accounts',
                            code: 4001
                        }
                    },
                    error: {
                        message: error.message || 'Failed to get accounts',
                        code: 4001
                    } // Include both for compatibility
                }, '*');
            }
            return;
        }

        // For all other methods, forward to background script
        let messageType = 'WEB3_REQUEST';

        // Create message for background script with proper format
        const requestForBackground = {
            type: messageType,
            method,
            params,
            origin,
            requestId
        };

        console.log('Sending request to background:', requestForBackground);

        // Send to background script with timeout handling
        try {
            const response = await sendBackgroundMessage(requestForBackground);
            console.log('Response from background:', response);

            // For pending requests (like signing/transactions), don't send immediate response to page
            // The background script will open a popup and send the response later
            if (response && response.pending) {
                console.log('Request is pending user approval');
                window.postMessage({
                    type: responseType,
                    requestId,
                    response: { pending: true },
                    result: { pending: true } // Include both for compatibility
                }, '*');
                return;
            }

            // For immediate responses, forward to page
            window.postMessage({
                type: responseType,
                requestId,
                response: response || { error: { message: 'No response from wallet', code: -32603 } },
                result: response || { error: { message: 'No response from wallet', code: -32603 } } // Include both for compatibility
            }, '*');
        } catch (error) {
            console.error('Error sending request to background:', error);
            window.postMessage({
                type: responseType,
                requestId,
                response: {
                    error: {
                        message: error.message || 'Request to wallet failed',
                        code: -32603
                    }
                },
                error: {
                    message: error.message || 'Request to wallet failed',
                    code: -32603
                } // Include both for compatibility
            }, '*');
        }
    } catch (error) {
        console.error('Error handling Web3 request:', error);

        // Determine the response type
        const responseType = message.type === 'CROSSNET_WEB3_REQUEST' ? 'CROSSNET_WEB3_RESPONSE' : 'CROSS_NET_WALLET_RESPONSE';

        // Send error to the page
        window.postMessage({
            type: responseType,
            requestId: message.requestId,
            response: {
                error: {
                    message: error.message || 'Failed to process request',
                    code: -32603
                }
            },
            error: {
                message: error.message || 'Failed to process request',
                code: -32603
            } // Include both for compatibility
        }, '*');
    }
}

// Handle WalletConnect requests
async function handleWalletConnectRequest(message) {
    try {
        // Add origin for security
        const requestWithOrigin = {
            ...message,
            type: 'WALLETCONNECT_SESSION_REQUEST',
            origin
        };

        // Send to background script
        const response = await chrome.runtime.sendMessage(requestWithOrigin);
        console.log('WalletConnect response from background:', response);

        // Send response back to the page
        window.postMessage({
            type: 'CROSS_NET_WALLET_RESPONSE',
            requestId: message.requestId,
            response
        }, '*');
    } catch (error) {
        console.error('WalletConnect request error:', error);

        // Send error back to the page
        window.postMessage({
            type: 'CROSS_NET_WALLET_RESPONSE',
            requestId: message.requestId,
            response: {
                error: {
                    message: error.message || 'Failed to process WalletConnect request',
                    code: -32603
                }
            }
        }, '*');
    }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);

    // Check if this is a response to a web3 request
    if (message.type === 'RESPONSE' && message.requestId) {
        // Forward the response back to the page
        window.postMessage({
            type: 'CROSSNET_WEB3_RESPONSE',
            requestId: message.requestId,
            result: message.result,
            error: message.error
        }, '*');

        console.log('Forwarded response to page:', message);

        // If the response is a successful connection, save the accounts locally
        if (message.result && message.result.connected && message.result.accounts) {
            localStorage.setItem('crossnet_connected_accounts', JSON.stringify(message.result.accounts));
            console.log('Saved connected accounts locally:', message.result.accounts);
        }
    }

    // Check if this is a wallet event (connect, disconnect, accountsChanged, chainChanged)
    if (message.type === 'WALLET_EVENT' && message.event) {
        console.log('Forwarding wallet event to page:', message.event, message.data);

        // Create a CustomEvent to dispatch to the window
        let event;

        switch (message.event) {
            case 'connect':
                event = new CustomEvent('crossnet_connect', {
                    detail: { chainId: message.data.chainId }
                });
                // Also dispatch a connect event for MetaMask compatibility
                window.postMessage({
                    type: 'metamask:chainChanged',
                    data: message.data.chainId
                }, '*');
                break;

            case 'disconnect':
                event = new CustomEvent('crossnet_disconnect', {
                    detail: message.data || { code: 1000, reason: 'Disconnected' }
                });
                // Clear local accounts on disconnect
                localStorage.removeItem('crossnet_connected_accounts');
                break;

            case 'accountsChanged':
                event = new CustomEvent('crossnet_accountsChanged', {
                    detail: message.data
                });
                // Also dispatch for MetaMask compatibility
                window.postMessage({
                    type: 'metamask:accountsChanged',
                    data: message.data
                }, '*');
                // Update local storage
                if (Array.isArray(message.data)) {
                    localStorage.setItem('crossnet_connected_accounts', JSON.stringify(message.data));
                }
                break;

            case 'chainChanged':
                event = new CustomEvent('crossnet_chainChanged', {
                    detail: message.data
                });
                // Also dispatch for MetaMask compatibility
                window.postMessage({
                    type: 'metamask:chainChanged',
                    data: message.data
                }, '*');
                break;

            default:
                console.warn('Unknown wallet event:', message.event);
                return;
        }

        // Dispatch the event
        window.dispatchEvent(event);

        // Also post a message for compatibility with older dApps
        window.postMessage({
            type: 'CROSSNET_WALLET_EVENT',
            event: message.event,
            data: message.data
        }, '*');
    }

    // Always return true for async messaging
    return true;
});

// Initialize connection state from background script
async function initializeState() {
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'GET_STATE',
            origin
        });

        if (response && response.state) {
            const state = response.state;
            const connectedSites = state.connectedSites || {};
            const siteInfo = connectedSites[origin];

            // If this site is connected, update local state
            if (siteInfo && siteInfo.connected) {
                connected = true;
                accounts = siteInfo.accounts || [];
                chainId = state.selectedChainId;
                console.log('Site is connected with accounts:', accounts);
            }
        }
    } catch (error) {
        console.error('Failed to initialize state:', error);
    }
}

// Initialize state when the content script loads
initializeState();

// Send a message to the background script with promise and timeout
async function sendBackgroundMessage(message, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
        // Generate a unique ID if the message doesn't have one
        if (!message.requestId) {
            message.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        console.log('Sending message to background script:', message);

        // Set a timeout to clean up if we don't get a response
        const timeoutId = setTimeout(() => {
            chrome.runtime.onMessage.removeListener(responseListener);
            reject(new Error(`Request to background script timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        // Add a response listener first (before sending the message)
        // This ensures we catch any async responses
        const responseListener = (response, sender) => {
            // Check if this response is for our specific requestId
            if (response && response.requestId === message.requestId) {
                // Clean up the listener and timeout
                clearTimeout(timeoutId);
                chrome.runtime.onMessage.removeListener(responseListener);

                console.log('Background script response via listener:', response);
                resolve(response.result !== undefined ? response.result : response);

                return true; // Keep the message channel open for async responses
            }
            return false; // Not our response
        };

        // Add the listener
        chrome.runtime.onMessage.addListener(responseListener);

        // Send the message
        try {
            chrome.runtime.sendMessage(message, (response) => {
                clearTimeout(timeoutId);

                // If there's a chrome runtime error, handle it
                if (chrome.runtime.lastError) {
                    console.error('Chrome runtime error:', chrome.runtime.lastError);
                    chrome.runtime.onMessage.removeListener(responseListener);

                    // Don't reject if it's just a message port closing error
                    if (chrome.runtime.lastError.message &&
                        chrome.runtime.lastError.message.includes('message port closed')) {
                        console.log('Message port closed, waiting for async response via listener');
                        return; // Keep waiting for the listener
                    }

                    reject(new Error(chrome.runtime.lastError.message || 'Error communicating with wallet'));
                    return;
                }

                // If we got an immediate response, use it and clean up the listener
                if (response !== undefined) {
                    chrome.runtime.onMessage.removeListener(responseListener);
                    console.log('Background script immediate response:', response);

                    // For wallet_switchEthereumChain, null is a valid success response
                    if (message.method === 'wallet_switchEthereumChain' && response === null) {
                        resolve(null);
                        return;
                    }

                    resolve(response.result !== undefined ? response.result : response);
                }
                // Otherwise, we'll wait for the async response via the listener
            });
        } catch (error) {
            clearTimeout(timeoutId);
            chrome.runtime.onMessage.removeListener(responseListener);
            console.error('Error sending message:', error);
            reject(error);
        }
    });
} 