import React, { useState } from 'react';
import { styled } from '@stitches/react';
import { keyframes } from '@stitches/react';
import { FaWallet, FaInfoCircle, FaShieldAlt, FaCheckCircle, FaTimes, FaExclamationTriangle, FaEthereum } from 'react-icons/fa';
import * as Separator from '@radix-ui/react-separator';

const fadeIn = keyframes({
    '0%': { opacity: 0 },
    '100%': { opacity: 1 },
});

const Container = styled('div', {
    maxWidth: '550px',
    margin: '0 auto',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
    backgroundColor: '#000000',
    color: '#ffffff',
});

const Card = styled('div', {
    border: '1px solid #333333',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    backgroundColor: '#121212',
    animation: `${fadeIn} 300ms ease`,
});

const Flex = styled('div', {
    display: 'flex',
    variants: {
        direction: {
            row: { flexDirection: 'row' },
            column: { flexDirection: 'column' },
        },
        align: {
            center: { alignItems: 'center' },
            start: { alignItems: 'flex-start' },
            end: { alignItems: 'flex-end' },
        },
        justify: {
            center: { justifyContent: 'center' },
            between: { justifyContent: 'space-between' },
            start: { justifyContent: 'flex-start' },
            end: { justifyContent: 'flex-end' },
        },
        gap: {
            small: { gap: '8px' },
            medium: { gap: '16px' },
            large: { gap: '24px' },
        }
    },
    defaultVariants: {
        direction: 'row',
        align: 'center',
        gap: 'small',
    }
});

const Text = styled('span', {
    variants: {
        size: {
            small: { fontSize: '12px' },
            normal: { fontSize: '14px' },
            large: { fontSize: '16px' },
        },
        weight: {
            normal: { fontWeight: 'normal' },
            bold: { fontWeight: 'bold' },
        },
        color: {
            primary: { color: '#FF8C00' },
            secondary: { color: '#cccccc' },
            warning: { color: '#FF8C00' },
        }
    },
    defaultVariants: {
        size: 'normal',
        weight: 'normal',
        color: 'secondary',
    }
});

const StyledButton = styled('button', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
    flex: 1,

    variants: {
        variant: {
            primary: {
                backgroundColor: '#FF8C00',
                color: 'black',
                '&:hover': { backgroundColor: '#FF7000' },
                '&:disabled': { backgroundColor: '#8B4D00', cursor: 'not-allowed' }
            },
            secondary: {
                backgroundColor: '#2a2a2a',
                color: '#d4d4d4',
                '&:hover': { backgroundColor: '#333333' },
                '&:disabled': { backgroundColor: '#1a1a1a', color: '#666666', cursor: 'not-allowed' }
            },
        },
    },
    defaultVariants: {
        variant: 'secondary',
    }
});

const InfoBox = styled('div', {
    backgroundColor: '#1a1a1a',
    border: '1px solid #FF8C00',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
});

const StyledList = styled('ul', {
    marginTop: '8px',
    paddingLeft: '24px',
    '& li': {
        marginBottom: '4px',
        color: '#ffffff',
    }
});

const StyledSeparator = styled(Separator.Root, {
    height: '1px',
    backgroundColor: '#333333',
    margin: '12px 0',
});

const Header = styled('div', {
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid #FF8C00',
});

// Spinning loader component
const Spinner = () => (
    <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
);

function WalletVerification({ wallet, onContinue, onCancel }) {
    const [isConfirming, setIsConfirming] = useState(false);

    const handleConfirm = () => {
        setIsConfirming(true);
        // Add a slight delay to show the confirming state
        setTimeout(() => {
            onContinue();
        }, 500);
    };

    // Format the address to show only first and last few characters
    const formatAddress = (address) => {
        if (!address) return '';
        return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
    };

    return (
        <Container>
            <Header>
                <Flex justify="center" gap="small">
                    <FaCheckCircle size={20} color="#FF8C00" />
                    <Text size="large" weight="bold" color="primary">Verify Your Wallet</Text>
                </Flex>
            </Header>

            <Card>
                <Flex gap="small" css={{ marginBottom: '16px' }}>
                    <FaWallet color="#FF8C00" />
                    <Text size="large" weight="bold" color="primary">Wallet Details</Text>
                </Flex>

                <Flex direction="column" gap="medium">
                    <Flex justify="between">
                        <Flex gap="small">
                            <FaEthereum color="#FF8C00" />
                            <Text color="secondary">Address:</Text>
                        </Flex>
                        <Text css={{ fontFamily: 'monospace', fontSize: '14px' }}>
                            {formatAddress(wallet?.address)}
                        </Text>
                    </Flex>

                    <StyledSeparator />

                    <Flex justify="between">
                        <Flex gap="small">
                            <FaEthereum color="#FF8C00" />
                            <Text color="secondary">Network:</Text>
                        </Flex>
                        <Text>Ethereum Mainnet</Text>
                    </Flex>
                </Flex>
            </Card>

            <InfoBox>
                <Flex gap="small">
                    <FaExclamationTriangle size={20} color="#FF8C00" />
                    <Text size="large" weight="bold" color="warning">Security Notice</Text>
                </Flex>

                <StyledList>
                    <li>Never share your private key or seed phrase with anyone</li>
                    <li>Verify that you're on the correct website</li>
                    <li>Keep your recovery phrase in a safe place</li>
                </StyledList>
            </InfoBox>

            <Card>
                <Flex gap="small">
                    <FaInfoCircle color="#FF8C00" />
                    <Text>
                        By continuing, you confirm that you understand the risks of
                        managing a cryptocurrency wallet and take full responsibility
                        for your funds.
                    </Text>
                </Flex>
            </Card>

            <Flex gap="medium" css={{ marginTop: '20px' }}>
                <StyledButton
                    onClick={onCancel}
                    disabled={isConfirming}
                    variant="secondary"
                >
                    <FaTimes />
                    <span>Cancel</span>
                </StyledButton>

                <StyledButton
                    onClick={handleConfirm}
                    disabled={isConfirming}
                    variant="primary"
                >
                    {isConfirming ? (
                        <>
                            <Spinner />
                            <span>Confirming...</span>
                        </>
                    ) : (
                        <>
                            <FaShieldAlt />
                            <span>Continue to Wallet</span>
                        </>
                    )}
                </StyledButton>
            </Flex>
        </Container>
    );
}

export default WalletVerification;