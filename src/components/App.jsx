import React, { useState, useEffect } from 'react';
import WalletConnect from './WalletConnect.jsx';
import WalletCreate from './WalletCreate.jsx';
import WalletVerification from './WalletVerification.jsx';
import Dashboard from './Dashboard.jsx';
import {
    walletExists,
    getWalletData,
    clearWalletData,
    hasActiveSession,
    getSessionPassword
} from '../services/storage.jsx';
import { FaWallet, FaPlus, FaUnlock, FaShieldAlt } from 'react-icons/fa';
import { styled } from '@stitches/react';

// Apply a global style to ensure dark background extends throughout
const globalStyles = {
    'body, html': {
        backgroundColor: '#121212',
        margin: 0,
        padding: 0,
        minHeight: '100vh',
        color: '#f0f0f0',
    }
};

// Styled components using Stitches
const AppContainer = styled('div', {
    backgroundColor: '#121212',
    color: '#f0f0f0',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Inter, system-ui, sans-serif',
    width: '680px',
    position: 'relative', // Add position relative
    overflow: 'auto', // Ensure overflow is handled properly
});

const AppHeader = styled('header', {
    padding: '24px 20px',
    borderBottom: '1px solid #2a2a2a',
    textAlign: 'center',
    backgroundColor: '#121212', // Ensure header has background
});

const AppContent = styled('main', {
    flex: 1,
    padding: '24px 20px',
    maxWidth: '680px',
    margin: '0 auto',
    width: '100%',
    backgroundColor: '#121212', // Ensure content has background
});

const AppFooter = styled('footer', {
    padding: '16px',
    borderTop: '1px solid #2a2a2a',
    textAlign: 'center',
    backgroundColor: '#121212', // Ensure footer has background
    width: '100%',
});

const FlexCenter = styled('div', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
});

const Heading = styled('h1', {
    fontSize: '24px',
    fontWeight: '600',
    margin: 0,
    background: 'linear-gradient(90deg, #FF8A00 0%, #FF5C00 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
});

const Subtitle = styled('p', {
    color: '#a0a0a0',
    fontSize: '14px',
    marginTop: '8px',
    marginBottom: 0,
});

const TabContainer = styled('div', {
    display: 'flex',
    marginBottom: '24px',
    borderRadius: '8px',
    border: '1px solid #2a2a2a',
    overflow: 'hidden',
});

const Tab = styled('div', {
    flex: 1,
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontWeight: '500',
    color: '#a0a0a0',

    '&:hover': {
        backgroundColor: '#1e1e1e',
    },

    variants: {
        active: {
            true: {
                backgroundColor: '#1e1e1e',
                color: '#FF8A00',
                borderBottom: '2px solid #FF8A00',
            }
        }
    }
});

const TabContent = styled('div', {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
    border: '1px solid #2a2a2a',
});

const Alert = styled('div', {
    backgroundColor: 'rgba(255, 138, 0, 0.1)',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '24px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    border: '1px solid rgba(255, 138, 0, 0.2)',

    '& svg': {
        color: '#FF8A00',
        flexShrink: 0,
        marginTop: '2px',
    }
});

const AlertTitle = styled('p', {
    margin: 0,
    fontWeight: '600',
    color: '#FF8A00',
});

const AlertText = styled('p', {
    fontSize: '14px',
    margin: '4px 0 0 0',
    color: '#d0d0d0',
});

const FooterText = styled('p', {
    fontSize: '12px',
    color: '#707070',
    margin: 0,
});

function App() {
    const [activeTab, setActiveTab] = useState('connect');
    const [wallet, setWallet] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showVerification, setShowVerification] = useState(false);
    const [tempWallet, setTempWallet] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // Add loading state for session check
    const [pendingRequest, setPendingRequest] = useState(null);

    // Check if we're in an extension context
    const isExtensionContext = typeof chrome !== 'undefined' && chrome.storage;

    // Apply global styles
    useEffect(() => {
        const styleElement = document.createElement('style');
        let styleString = '';
        for (const selector in globalStyles) {
            styleString += `${selector} {`;
            for (const prop in globalStyles[selector]) {
                styleString += `${prop}: ${globalStyles[selector][prop]};`;
            }
            styleString += '}';
        }
        styleElement.innerHTML = styleString;
        document.head.appendChild(styleElement);

        return () => {
            document.head.removeChild(styleElement);
        };
    }, []);

    // Check for pending requests (when in extension context)
    useEffect(() => {
        if (isExtensionContext && chrome.storage) {
            // Check if there's a pending request in storage
            chrome.storage.local.get(['currentPendingRequest'], (result) => {
                if (result.currentPendingRequest) {
                    console.log('Found pending request in storage:', result.currentPendingRequest);
                    setPendingRequest(result.currentPendingRequest);
                }
            });

            // Listen for new pending requests
            const messageListener = (message) => {
                if (message.type === 'PENDING_REQUEST') {
                    console.log('Received new pending request:', message);
                    setPendingRequest(message);
                }
            };

            chrome.runtime.onMessage.addListener(messageListener);

            return () => {
                chrome.runtime.onMessage.removeListener(messageListener);
            };
        }
    }, [isExtensionContext]);

    // Check for active session and auto-login - this should run FIRST
    useEffect(() => {
        const checkActiveSession = async () => {
            setIsLoading(true);
            console.log('Checking for active session...');

            try {
                // Check if there's an active session and a wallet exists
                if (hasActiveSession()) {
                    console.log('Active session found, attempting auto-login');

                    if (walletExists()) {
                        console.log('Wallet data found, retrieving session password');

                        // Get password from session
                        const sessionPassword = getSessionPassword();

                        if (sessionPassword) {
                            console.log('Session password retrieved, decrypting wallet data');

                            // Get wallet data using the session password
                            const walletData = getWalletData(sessionPassword);

                            if (walletData) {
                                console.log('Auto-login successful!');
                                // Auto-login the user
                                setWallet(walletData);
                                setIsAuthenticated(true);
                            } else {
                                console.warn('Failed to decrypt wallet data with session password');
                            }
                        } else {
                            console.warn('Could not retrieve valid session password');
                        }
                    } else {
                        console.warn('No wallet data found despite having an active session');
                    }
                } else {
                    console.log('No active session found, normal login required');
                }
            } catch (error) {
                console.error('Session auto-login failed:', error);
            } finally {
                // Determine which tab to show if not logged in
                if (!isAuthenticated) {
                    const hasWallet = walletExists();
                    setActiveTab(hasWallet ? 'connect' : 'create');
                    console.log(`Setting active tab to: ${hasWallet ? 'connect' : 'create'}`);
                }

                setIsLoading(false);
                console.log('Finished session check');
            }
        };

        checkActiveSession();
    }, []);

    // Handle wallet connection success
    const handleWalletConnected = (walletData) => {
        // Store the wallet data temporarily and show verification
        setTempWallet(walletData);
        setShowVerification(true);
    };

    // Handle verification confirmation
    const handleVerificationConfirmed = () => {
        setWallet(tempWallet);
        setIsAuthenticated(true);
        setShowVerification(false);
        setTempWallet(null);
    };

    // Handle verification cancellation
    const handleVerificationCancelled = () => {
        setShowVerification(false);
        setTempWallet(null);
        // Optionally clear the saved wallet data if it was just saved
        // clearWalletData();
    };

    // Handle logout
    const handleLogout = () => {
        setWallet(null);
        setIsAuthenticated(false);
        // Clear wallet data when logging out
        clearWalletData();
    };

    // Handle completion of a pending request
    const handleRequestComplete = () => {
        setPendingRequest(null);

        // Also clear from storage
        if (isExtensionContext && chrome.storage) {
            chrome.storage.local.remove(['currentPendingRequest']);
        }
    };

    // Show loading indicator while checking for session
    if (isLoading) {
        return (
            <AppContainer>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    gap: '16px'
                }}>
                    <FaWallet size={32} color="#FF8A00" />
                    <div>Loading wallet...</div>
                </div>
            </AppContainer>
        );
    }

    // If verified and authenticated, show dashboard
    if (isAuthenticated && wallet) {
        return (
            <AppContainer>
                <Dashboard
                    wallet={wallet}
                    onLogout={handleLogout}
                    pendingRequest={pendingRequest}
                    onRequestComplete={handleRequestComplete}
                />
            </AppContainer>
        );
    }

    // If in verification step, show verification component
    if (showVerification && tempWallet) {
        return (
            <AppContainer>
                <WalletVerification
                    wallet={tempWallet}
                    onContinue={handleVerificationConfirmed}
                    onCancel={handleVerificationCancelled}
                />
            </AppContainer>
        );
    }

    // Otherwise show connect/create wallet UI
    return (
        <AppContainer>
            <AppHeader>
                <FlexCenter css={{ justifyContent: 'center' }}>
                    <FaWallet size={28} color="#FF8A00" />
                    <Heading>Crypto Wallet</Heading>
                </FlexCenter>
                <Subtitle>
                    Secure, easy-to-use wallet for Ethereum and ERC-20 tokens
                </Subtitle>
            </AppHeader>

            <AppContent>
                <TabContainer>
                    <Tab
                        active={activeTab === 'connect'}
                        onClick={() => setActiveTab('connect')}
                    >
                        <FaUnlock />
                        <span>Connect</span>
                    </Tab>
                    <Tab
                        active={activeTab === 'create'}
                        onClick={() => setActiveTab('create')}
                    >
                        <FaPlus />
                        <span>Create</span>
                    </Tab>
                </TabContainer>

                <TabContent>
                    {activeTab === 'connect' && (
                        <WalletConnect onWalletReady={handleWalletConnected} />
                    )}

                    {activeTab === 'create' && (
                        <WalletCreate onWalletReady={handleWalletConnected} />
                    )}
                </TabContent>

                <Alert>
                    <FaShieldAlt size={18} />
                    <div>
                        <AlertTitle>Secure Storage</AlertTitle>
                        <AlertText>All wallet data is encrypted and stored locally. Your keys never leave your device.</AlertText>
                    </div>
                </Alert>
            </AppContent>

            <AppFooter>
                <FooterText>
                    © 2025 Crypto Wallet | v1.0.0
                </FooterText>
            </AppFooter>
        </AppContainer>
    );
}

export default App;