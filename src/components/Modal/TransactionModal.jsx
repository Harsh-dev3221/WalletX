import React from 'react';
import { styled } from '@stitches/react';
import * as Dialog from '@radix-ui/react-dialog';
import { FaExclamationTriangle, FaNetworkWired, FaArrowRight, FaWallet, FaGasPump, FaMoneyBillWave } from 'react-icons/fa';
import { keyframes } from '@stitches/react';

const overlayShow = keyframes({
    '0%': { opacity: 0 },
    '100%': { opacity: 1 },
});

const contentShow = keyframes({
    '0%': { opacity: 0, transform: 'translate(-50%, -48%) scale(0.96)' },
    '100%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
});

const StyledOverlay = styled(Dialog.Overlay, {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    position: 'fixed',
    inset: 0,
    animation: `${overlayShow} 150ms cubic-bezier(0.16, 1, 0.3, 1)`,
});

const StyledContent = styled(Dialog.Content, {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90vw',
    maxWidth: '450px',
    maxHeight: '85vh',
    padding: '24px',
    animation: `${contentShow} 150ms cubic-bezier(0.16, 1, 0.3, 1)`,

    '&:focus': { outline: 'none' },
});

const StyledTitle = styled(Dialog.Title, {
    margin: 0,
    fontWeight: 600,
    fontSize: '1.25rem',
    color: '#111827',
    marginBottom: '16px',
    textAlign: 'center',
});

const DetailsList = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
});

const DetailItem = styled('div', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',

    variants: {
        highlight: {
            true: {
                padding: '12px 8px',
                backgroundColor: '#f0f9ff',
                borderRadius: '6px',
                marginTop: '8px',
                borderTop: '1px solid #e0f2fe',
                borderBottom: '1px solid #e0f2fe',
                fontWeight: 600,
            }
        }
    }
});

const DetailLabel = styled('span', {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#4b5563',
    fontSize: '0.875rem',
});

const DetailValue = styled('span', {
    fontWeight: 500,
    color: '#111827',
    fontSize: '0.875rem',

    variants: {
        type: {
            network: {
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 10px',
                backgroundColor: '#ecfdf5',
                color: '#065f46',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: 600,
            },
            address: {
                fontFamily: 'monospace',
            },
            amount: {
                color: '#047857',
                fontWeight: 600,
            },
            total: {
                color: '#0f766e',
                fontWeight: 700,
                fontSize: '1rem',
            }
        }
    }
});

const WarningBox = styled('div', {
    backgroundColor: '#fff7ed',
    border: '1px solid #ffedd5',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
});

const WarningTitle = styled('p', {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '0 0 8px 0',
    fontWeight: 600,
    color: '#c2410c',
});

const WarningText = styled('p', {
    margin: 0,
    fontSize: '0.875rem',
    color: '#7c2d12',
    lineHeight: 1.5,
});

const ButtonGroup = styled('div', {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    marginTop: '20px',
});

const Button = styled('button', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '8px',
    fontWeight: 500,
    fontSize: '0.875rem',
    transition: 'all 0.2s',
    cursor: 'pointer',
    border: 'none',
    flex: 1,

    '&:focus': {
        outline: 'none',
        boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5)',
    },

    variants: {
        variant: {
            primary: {
                backgroundColor: '#0284c7',
                color: 'white',
                '&:hover': {
                    backgroundColor: '#0369a1',
                },
            },
            secondary: {
                backgroundColor: '#f1f5f9',
                color: '#475569',
                '&:hover': {
                    backgroundColor: '#e2e8f0',
                },
            },
        },
    },
});

function TransactionConfirmation({
    transaction,
    selectedChain,
    wallet,
    onConfirm,
    onCancel,
    open = true
}) {
    const { amount, recipient } = transaction;

    // Format address for display
    const formatAddress = (address) => {
        if (!address) return 'N/A';
        return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
    };

    // Calculate gas cost (simplified estimate)
    const estimatedGasCost = "0.0001"; // Simplified, in production you'd calculate this
    const totalCost = (parseFloat(amount) + parseFloat(estimatedGasCost)).toFixed(6);

    return (
        <Dialog.Root open={open}>
            <Dialog.Portal>
                <StyledOverlay />
                <StyledContent>
                    <StyledTitle>Confirm Transaction</StyledTitle>

                    <DetailsList>
                        <DetailItem>
                            <DetailLabel>
                                <FaNetworkWired size={14} /> Network
                            </DetailLabel>
                            <DetailValue type="network">
                                {selectedChain.chainName}
                            </DetailValue>
                        </DetailItem>

                        <DetailItem>
                            <DetailLabel>
                                <FaWallet size={14} /> From
                            </DetailLabel>
                            <DetailValue type="address">
                                {formatAddress(wallet.address)}
                            </DetailValue>
                        </DetailItem>

                        <DetailItem>
                            <DetailLabel>
                                <FaArrowRight size={14} /> To
                            </DetailLabel>
                            <DetailValue type="address">
                                {formatAddress(recipient)}
                            </DetailValue>
                        </DetailItem>

                        <DetailItem>
                            <DetailLabel>
                                <FaMoneyBillWave size={14} /> Amount
                            </DetailLabel>
                            <DetailValue type="amount">
                                {amount} {selectedChain.currencySymbol}
                            </DetailValue>
                        </DetailItem>

                        <DetailItem>
                            <DetailLabel>
                                <FaGasPump size={14} /> Estimated Gas Fee
                            </DetailLabel>
                            <DetailValue>
                                ~{estimatedGasCost} {selectedChain.currencySymbol}
                            </DetailValue>
                        </DetailItem>

                        <DetailItem highlight>
                            <DetailLabel>
                                <FaMoneyBillWave size={14} /> Total
                            </DetailLabel>
                            <DetailValue type="total">
                                ~{totalCost} {selectedChain.currencySymbol}
                            </DetailValue>
                        </DetailItem>
                    </DetailsList>

                    <WarningBox>
                        <WarningTitle>
                            <FaExclamationTriangle size={14} />
                            Verify all details carefully
                        </WarningTitle>
                        <WarningText>
                            This transaction cannot be reversed once confirmed.
                            Make sure the recipient address is correct.
                        </WarningText>
                    </WarningBox>

                    <ButtonGroup>
                        <Button variant="secondary" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={onConfirm}>
                            Confirm Transaction
                        </Button>
                    </ButtonGroup>
                </StyledContent>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

export default TransactionConfirmation;