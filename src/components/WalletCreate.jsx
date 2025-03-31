import React, { useState, useEffect } from 'react';
import { createWallet } from '../services/wallet.jsx';
import { saveWalletData, saveSession } from '../services/storage.jsx';
import SeedPhrase from './SeedPhrase.jsx';
import * as Form from '@radix-ui/react-form';
import * as Progress from '@radix-ui/react-progress';
import { styled } from '@stitches/react';
import {
    Plus,
    Lock,
    AlertTriangle,
    Shield,
    Check,
    Info,
    Loader
} from 'lucide-react';

// Styled components with black and orange theme
const StyledCard = styled('div', {
    backgroundColor: '#111111',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
    color: '#fff',
    overflow: 'hidden',
    border: '1px solid #222',
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
    padding: '12px 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.25s ease',
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
                    boxShadow: '0 5px 15px rgba(255, 107, 0, 0.25)',
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
    padding: '12px 14px',
    paddingRight: '40px',
    backgroundColor: '#1A1A1A',
    color: 'white',
    border: '1px solid #333',
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'all 0.2s ease',
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
    marginBottom: '20px',
});

const InputWrapper = styled('div', {
    position: 'relative',
    width: '100%',
});

const Label = styled('label', {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#DDD',
    fontWeight: 500,
});

const HelperText = styled('div', {
    fontSize: '12px',
    marginTop: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#999',
});

const ErrorAlert = styled('div', {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    color: '#ef4444',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '16px',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid rgba(220, 38, 38, 0.2)',
});

const WarningAlert = styled('div', {
    backgroundColor: 'rgba(255, 167, 38, 0.08)',
    color: '#FF9800',
    borderRadius: '6px',
    padding: '12px 16px',
    marginTop: '16px',
    fontSize: '14px',
    border: '1px solid rgba(255, 167, 38, 0.2)',
});

const AlertTitle = styled('h3', {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '4px',
    color: '#FFA726',
});

const AlertText = styled('p', {
    fontSize: '13px',
    margin: 0,
    lineHeight: 1.5,
    color: '#DDD',
});

const Spinner = styled(Loader, {
    animation: 'spin 1s linear infinite',
    '@keyframes spin': {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' }
    }
});

const StrengthBar = styled(Progress.Root, {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#333',
    borderRadius: '99px',
    width: '100%',
    height: '4px',
    marginTop: '8px',
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

const IconContainer = styled('div', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '36px',
    width: '36px',
    borderRadius: '50%',
    marginRight: '12px',
    flexShrink: 0,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
});

function WalletCreate({ onWalletReady }) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [newWallet, setNewWallet] = useState(null);
    const [showSeedPhrase, setShowSeedPhrase] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);

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

    const handleCreateWallet = async (e) => {
        e.preventDefault();

        // Basic validation
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Create a new wallet
            const result = await createWallet();

            if (result.success) {
                setNewWallet(result.wallet);
                setShowSeedPhrase(true);
            } else {
                setError(result.error || 'Failed to create wallet');
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSeedPhraseConfirmed = () => {
        // Save wallet data securely after seed phrase is confirmed
        saveWalletData(newWallet, password);

        // Always save session (no checkbox anymore)
        saveSession(password);

        // Notify parent component
        onWalletReady(newWallet);
    };

    if (showSeedPhrase && newWallet) {
        return (
            <SeedPhrase
                mnemonic={newWallet.mnemonic}
                onConfirmed={handleSeedPhraseConfirmed}
            />
        );
    }

    return (
        <div>
            <StyledCard>
                <CardHeader>
                    <IconContainer>
                        <Plus size={18} color="#FF6B00" />
                    </IconContainer>
                    <CardTitle>Create New Wallet</CardTitle>
                </CardHeader>

                <CardContent>
                    {error && (
                        <ErrorAlert>
                            <AlertTriangle size={16} />
                            <span>{error}</span>
                        </ErrorAlert>
                    )}

                    <Form.Root onSubmit={handleCreateWallet}>
                        <FormGroup>
                            <Label htmlFor="createPassword">
                                <Lock size={14} />
                                <span>Password to Encrypt Wallet</span>
                            </Label>
                            <InputWrapper>
                                <StyledInput
                                    type="password"
                                    id="createPassword"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Create a password (min. 8 characters)"
                                    required
                                    autoComplete="new-password"
                                />
                                {password && (
                                    <StrengthText strength={getPasswordStrengthVariant()} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                                        {getPasswordStrengthLabel()}
                                    </StrengthText>
                                )}
                            </InputWrapper>
                            <div>
                                <HelperText>
                                    <Info size={12} />
                                    This password will encrypt and protect your wallet data
                                </HelperText>
                                {password && (
                                    <StrengthBar value={passwordStrength * 20}>
                                        <StrengthIndicator
                                            style={{ transform: `translateX(-${100 - passwordStrength * 20}%)` }}
                                            strength={getPasswordStrengthVariant()}
                                        />
                                    </StrengthBar>
                                )}
                            </div>
                        </FormGroup>

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

                        <Button
                            type="submit"
                            disabled={isLoading}
                            css={{ marginTop: '24px' }}
                        >
                            {isLoading ? "Creating..." : "Create New Wallet"}
                        </Button>
                    </Form.Root>
                </CardContent>
            </StyledCard>

            <WarningAlert>
                <div style={{ display: 'flex' }}>
                    <IconContainer style={{ backgroundColor: 'rgba(255, 167, 38, 0.1)' }}>
                        <Shield size={18} color="#FFA726" />
                    </IconContainer>
                    <div>
                        <AlertTitle>Important: Secure Your Seed Phrase</AlertTitle>
                        <AlertText>
                            After creating your wallet, you'll be shown a recovery seed phrase.
                            Store it securely offline - it's the only way to recover your wallet
                            and assets if you lose access to this device.
                        </AlertText>
                    </div>
                </div>
            </WarningAlert>
        </div>
    );
}

export default WalletCreate;