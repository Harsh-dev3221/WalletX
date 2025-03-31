import React, { useState, useEffect } from 'react';
import { connectWalletWithPrivateKey, isValidPrivateKey } from '../services/wallet.jsx';
import {
    saveWalletData,
    walletExists,
    getWalletData,
    hasStoredPassword,
    verifyPassword,
    saveSession
} from '../services/storage.jsx';
import * as Form from '@radix-ui/react-form';
import * as Dialog from '@radix-ui/react-dialog';
import * as Progress from '@radix-ui/react-progress';
import * as Alert from '@radix-ui/react-alert-dialog';
import { styled } from '@stitches/react';
import {
    Eye,
    EyeOff,
    Key,
    Lock,
    Shield,
    AlertTriangle,
    Check,
    Info
} from 'lucide-react';

// Styled components with black and orange theme
const StyledCard = styled('div', {
    backgroundColor: '#111111',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    color: '#fff',
    overflow: 'hidden',
});

const CardHeader = styled('div', {
    padding: '16px 20px',
    borderBottom: '1px solid #222',
    display: 'flex',
    alignItems: 'center',
});

const CardTitle = styled('h2', {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
});

const CardContent = styled('div', {
    padding: '20px',
});

const Button = styled('button', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%',
    marginTop: '8px',

    '&:disabled': {
        opacity: 0.6,
        cursor: 'not-allowed',
    },

    variants: {
        variant: {
            primary: {
                backgroundColor: '#FF6B00',
                color: 'white',
                '&:hover': {
                    backgroundColor: '#FF8124',
                    transform: 'translateY(-1px)',
                },
            },
            ghost: {
                backgroundColor: 'transparent',
                color: '#666',
                '&:hover': {
                    backgroundColor: 'rgba(255, 107, 0, 0.1)',
                },
            },
        },
    },
});

const StyledInput = styled('input', {
    width: '100%',
    padding: '10px 14px',
    paddingRight: '40px',
    backgroundColor: '#1A1A1A',
    color: 'white',
    border: '1px solid #333',
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'border-color 0.2s',
    outline: 'none',

    '&:focus': {
        borderColor: '#FF6B00',
        boxShadow: '0 0 0 1px rgba(255, 107, 0, 0.3)',
    },

    '&::placeholder': {
        color: '#666',
    },
});

const FormGroup = styled('div', {
    marginBottom: '16px',
});

const InputWrapper = styled('div', {
    position: 'relative',
    width: '100%',
});

const IconButton = styled('button', {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
    padding: '4px',
    transition: 'color 0.2s',

    '&:hover': {
        color: '#FF6B00',
    },
});

const Label = styled('label', {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '6px',
    fontSize: '14px',
    color: '#CCC',
});

const HelperText = styled('div', {
    fontSize: '12px',
    marginTop: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: '#999',
});

const ErrorAlert = styled('div', {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    color: '#ef4444',
    borderRadius: '6px',
    padding: '10px 12px',
    marginBottom: '16px',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
});

const SecurityAlert = styled('div', {
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    color: '#FF6B00',
    borderRadius: '6px',
    padding: '12px',
    marginTop: '16px',
    fontSize: '14px',
});

const SecurityTitle = styled('h3', {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '4px',
});

const SecurityText = styled('p', {
    fontSize: '13px',
    margin: 0,
    color: '#CCC',
});

const Spinner = styled('div', {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '50%',
    borderTopColor: 'white',
    animation: 'spin 0.8s linear infinite',
    marginRight: '8px',

    '@keyframes spin': {
        to: { transform: 'rotate(360deg)' }
    }
});

const StrengthBar = styled(Progress.Root, {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#333',
    borderRadius: '99px',
    width: '100%',
    height: '4px',
    marginTop: '6px',
});

const StrengthIndicator = styled(Progress.Indicator, {
    backgroundColor: '#FF6B00',
    width: '100%',
    height: '100%',
    transition: 'transform 250ms cubic-bezier(0.65, 0, 0.35, 1)',
    transform: 'translateX(-100%)',

    variants: {
        strength: {
            weak: { backgroundColor: '#ef4444' },
            medium: { backgroundColor: '#f59e0b' },
            strong: { backgroundColor: '#10b981' },
        }
    }
});

const StrengthText = styled('span', {
    fontSize: '12px',
    fontWeight: 500,
    marginLeft: 'auto',

    variants: {
        strength: {
            weak: { color: '#ef4444' },
            medium: { color: '#f59e0b' },
            strong: { color: '#10b981' },
        }
    }
});

// Define the missing InfoBox component
const InfoBox = styled('div', {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px 16px',
    backgroundColor: 'rgba(66, 153, 225, 0.1)',
    border: '1px solid rgba(66, 153, 225, 0.2)',
    borderRadius: '8px',
    color: '#3182ce',
    fontSize: '14px',
    lineHeight: '1.5',
    marginBottom: '16px',
});

function WalletConnect({ onWalletReady }) {
    const [privateKey, setPrivateKey] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPrivateKey, setShowPrivateKey] = useState(false);
    const [isNewUser, setIsNewUser] = useState(true);
    const [passwordStrength, setPasswordStrength] = useState(0);

    // Check if user is new or returning on component mount
    useEffect(() => {
        // If the user has a stored password, they're a returning user
        const hasPassword = hasStoredPassword();
        setIsNewUser(!hasPassword);
    }, []);

    // Check password strength
    useEffect(() => {
        if (!password) {
            setPasswordStrength(0);
            return;
        }

        let strength = 0;
        // Length check
        if (password.length >= 8) strength += 1;
        // Contains number
        if (/\d/.test(password)) strength += 1;
        // Contains lowercase
        if (/[a-z]/.test(password)) strength += 1;
        // Contains uppercase
        if (/[A-Z]/.test(password)) strength += 1;
        // Contains special char
        if (/[^a-zA-Z0-9]/.test(password)) strength += 1;

        setPasswordStrength(strength);
    }, [password]);

    const getPasswordStrengthLabel = () => {
        if (passwordStrength === 0) return '';
        if (passwordStrength < 3) return 'Weak';
        if (passwordStrength < 5) return 'Good';
        return 'Strong';
    };

    const getPasswordStrengthVariant = () => {
        if (passwordStrength === 0) return undefined;
        if (passwordStrength < 3) return 'weak';
        if (passwordStrength < 5) return 'medium';
        return 'strong';
    };

    const validateForm = () => {
        // Clear previous errors
        setError('');

        // Check if private key is provided
        if (!privateKey.trim()) {
            setError('Please enter your private key');
            return false;
        }

        // Check if private key has valid format
        if (!isValidPrivateKey(privateKey)) {
            setError('Invalid private key format');
            return false;
        }

        // Check if password is provided
        if (!password) {
            setError('Please enter a password');
            return false;
        }

        // For new users, perform additional password validation
        if (isNewUser) {
            // Check password length
            if (password.length < 8) {
                setError('Password must be at least 8 characters long');
                return false;
            }

            // Check if passwords match
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return false;
            }
        } else {
            // For returning users, verify the password
            if (!verifyPassword(password)) {
                setError('Incorrect password. Please try again.');
                return false;
            }
        }

        return true;
    };

    const handleConnect = async (e) => {
        e.preventDefault();

        // Validate form inputs
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            // Connect to wallet using private key
            const result = await connectWalletWithPrivateKey(privateKey);

            if (result.success) {
                // Save wallet data securely
                const walletData = {
                    address: result.wallet.address,
                    privateKey: result.wallet.privateKey,
                    balance: result.wallet.balance,
                    mnemonic: null,
                    type: 'imported'
                };

                // Save wallet data with password
                const saved = saveWalletData(walletData, password);

                if (saved) {
                    // Always save the session now
                    saveSession(password);

                    // Notify parent component
                    onWalletReady(walletData);
                } else {
                    setError('Failed to securely save wallet data');
                }
            } else {
                setError(result.error || 'Failed to connect wallet');
            }
        } catch (error) {
            console.error('Wallet connection error:', error);
            setError(error.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const togglePrivateKeyVisibility = () => {
        setShowPrivateKey(!showPrivateKey);
    };

    return (
        <div>
            <StyledCard>
                <CardHeader>
                    <Key size={18} color="#FF6B00" style={{ marginRight: '8px' }} />
                    <CardTitle>Connect Your Wallet</CardTitle>
                </CardHeader>

                <CardContent>
                    {error && (
                        <ErrorAlert>
                            <AlertTriangle size={16} />
                            <span>{error}</span>
                        </ErrorAlert>
                    )}

                    <InfoBox>
                        <Info size={16} />
                        <div>
                            {isNewUser
                                ? 'First time connecting? You\'ll need to create a password to encrypt your private key.'
                                : 'Welcome back! Enter your private key and password to connect.'}
                        </div>
                    </InfoBox>

                    <Form.Root onSubmit={handleConnect}>
                        <FormGroup>
                            <Label htmlFor="privateKey">
                                <Key size={14} />
                                <span>Private Key</span>
                            </Label>
                            <InputWrapper>
                                <StyledInput
                                    type={showPrivateKey ? "text" : "password"}
                                    id="privateKey"
                                    value={privateKey}
                                    onChange={(e) => setPrivateKey(e.target.value)}
                                    placeholder="Enter your private key"
                                    required
                                    autoComplete="off"
                                />
                                <IconButton
                                    type="button"
                                    onClick={togglePrivateKeyVisibility}
                                    aria-label={showPrivateKey ? "Hide private key" : "Show private key"}
                                >
                                    {showPrivateKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                </IconButton>
                            </InputWrapper>
                        </FormGroup>

                        <FormGroup>
                            <Label htmlFor="password">
                                <Lock size={14} />
                                <span>{isNewUser ? 'Create Password' : 'Enter Password'}</span>
                            </Label>
                            <InputWrapper>
                                <StyledInput
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={isNewUser ? 'Create a password (min. 8 characters)' : 'Enter your password'}
                                    required
                                    autoComplete="new-password"
                                />
                                {isNewUser && password && (
                                    <StrengthText strength={getPasswordStrengthVariant()}>
                                        {getPasswordStrengthLabel()}
                                    </StrengthText>
                                )}
                            </InputWrapper>
                        </FormGroup>

                        {isNewUser && (
                            <FormGroup>
                                <Label htmlFor="confirmPassword">
                                    <Lock size={14} />
                                    <span>Confirm Password</span>
                                </Label>
                                <InputWrapper>
                                    <StyledInput
                                        type="password"
                                        id="confirmPassword"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm your password"
                                        required
                                        autoComplete="new-password"
                                    />
                                    {confirmPassword && password === confirmPassword && (
                                        <Check size={16} color="#10b981" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                    )}
                                </InputWrapper>
                            </FormGroup>
                        )}

                        <Button
                            type="submit"
                            css={{ marginTop: '24px' }}
                            disabled={isLoading}
                        >
                            {isLoading ? "Connecting..." : "Connect Wallet"}
                        </Button>
                    </Form.Root>
                </CardContent>
            </StyledCard>

            <SecurityAlert>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Shield size={18} />
                    <div>
                        <SecurityTitle>Security Note</SecurityTitle>
                        <SecurityText>
                            Your private key will be encrypted and stored locally in your browser.
                            Never share your private key with anyone.
                        </SecurityText>
                    </div>
                </div>
            </SecurityAlert>
        </div>
    );
}

export default WalletConnect;