import React from 'react';
import { styled } from '@stitches/react';
import {
    ShieldCheckIcon,
    ShieldExclamationIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationCircleIcon,
    GlobeAltIcon,
    CurrencyDollarIcon,
    ArrowsRightLeftIcon,
    IdentificationIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { ethers } from 'ethers';

// Styled component definitions
const RequestContainer = styled('div', {
    backgroundColor: '#1A1A1A',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    border: '1px solid #333',
    maxWidth: '480px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
});

const RequestHeader = styled('div', {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid #333',
    paddingBottom: '16px',
});

const WebsiteInfo = styled('div', {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#222',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #444',
});

const SiteIcon = styled('div', {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: '#333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
});

const SiteDetails = styled('div', {
    overflow: 'hidden',
});

const SiteName = styled('div', {
    fontWeight: '600',
    color: '#FFF',
    fontSize: '16px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
});

const SiteUrl = styled('div', {
    fontSize: '14px',
    color: '#999',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
});

const Title = styled('h2', {
    margin: 0,
    color: '#FFF',
    fontSize: '20px',
    fontWeight: '600',
});

const Description = styled('p', {
    color: '#BBB',
    fontSize: '14px',
    margin: '8px 0 0 0',
    lineHeight: '1.5',
});

const DataSection = styled('div', {
    backgroundColor: '#222',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #444',
});

const DataRow = styled('div', {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',

    '&:not(:last-child)': {
        borderBottom: '1px solid #333',
        marginBottom: '8px',
    },
});

const DataLabel = styled('div', {
    color: '#999',
    fontSize: '14px',
});

const DataValue = styled('div', {
    color: '#FFF',
    fontSize: '14px',
    fontWeight: '500',
    wordBreak: 'break-all',

    variants: {
        mono: {
            true: {
                fontFamily: 'monospace',
            },
        },
    },
});

const ActionButtons = styled('div', {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
});

const Button = styled('button', {
    flex: 1,
    padding: '14px 20px',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',

    variants: {
        variant: {
            approve: {
                backgroundColor: '#27AE60',
                color: '#FFF',
                '&:hover': {
                    backgroundColor: '#2ECC71',
                },
            },
            reject: {
                backgroundColor: '#333',
                color: '#EEE',
                '&:hover': {
                    backgroundColor: '#444',
                },
            },
            danger: {
                backgroundColor: '#E74C3C',
                color: '#FFF',
                '&:hover': {
                    backgroundColor: '#C0392B',
                },
            },
        },
    },
});

const WarningMessage = styled('div', {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px 16px',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    border: '1px solid rgba(231, 76, 60, 0.2)',
    borderRadius: '8px',
    color: '#E74C3C',
    fontSize: '14px',
    lineHeight: '1.5',
});

const Icon = styled('div', {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
});

// Component to format address
const FormattedAddress = ({ address }) => {
    if (!address) return null;
    const short = `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;

    return (
        <div style={{ fontFamily: 'monospace' }}>
            {short}
        </div>
    );
};

// Format transaction amount in ETH
const formatValue = (value) => {
    try {
        if (!value) return '0';
        return ethers.utils.formatEther(value);
    } catch (e) {
        console.error('Error formatting value:', e);
        return '0';
    }
};

const RequestApproval = ({
    request,
    wallet,
    onClose,
    onApprove,
    onReject,
    loading,
    error: externalError
}) => {
    // Handle case where request is null or undefined
    if (!request) {
        return (
            <RequestContainer>
                <RequestHeader>
                    <Icon>
                        <ExclamationTriangleIcon width={28} height={28} color="#E74C3C" />
                    </Icon>
                    <div>
                        <Title>No Pending Request</Title>
                        <Description>There is no pending request to approve or reject</Description>
                    </div>
                </RequestHeader>
                <ActionButtons>
                    <Button variant="reject" onClick={onClose}>
                        <XCircleIcon width={20} height={20} />
                        Close
                    </Button>
                </ActionButtons>
            </RequestContainer>
        );
    }

    // Safely extract properties from request with defaults
    const { type = 'connect', origin = 'Unknown site', transaction = {} } = request;
    const isConnection = type === 'connect';

    // Safely extract wallet address
    const walletAddress = wallet?.address || 'Unknown';

    // Get domain name from origin with error handling
    const getDomainName = (origin) => {
        try {
            if (!origin || typeof origin !== 'string') return 'Unknown site';
            if (origin.startsWith('http')) {
                const url = new URL(origin);
                return url.hostname;
            }
            return origin;
        } catch {
            return origin || 'Unknown site';
        }
    };

    // Connection request UI
    if (isConnection) {
        return (
            <RequestContainer>
                <RequestHeader>
                    <Icon>
                        <ShieldCheckIcon width={28} height={28} color="#3498DB" />
                    </Icon>
                    <div>
                        <Title>Connection Request</Title>
                        <Description>This site is requesting to connect to your wallet</Description>
                    </div>
                </RequestHeader>

                <WebsiteInfo>
                    <SiteIcon>
                        <GlobeAltIcon width={20} height={20} color="#FFF" />
                    </SiteIcon>
                    <SiteDetails>
                        <SiteName>{getDomainName(origin)}</SiteName>
                        <SiteUrl>{origin}</SiteUrl>
                    </SiteDetails>
                </WebsiteInfo>

                <DataSection>
                    <DataRow>
                        <DataLabel>Account to connect</DataLabel>
                        <DataValue mono={true}>
                            <FormattedAddress address={walletAddress} />
                        </DataValue>
                    </DataRow>

                    <DataRow>
                        <DataLabel>Permissions</DataLabel>
                        <DataValue>View address</DataValue>
                    </DataRow>
                </DataSection>

                <WarningMessage>
                    <Icon>
                        <ExclamationCircleIcon width={20} height={20} color="#E74C3C" />
                    </Icon>
                    <div>
                        Only connect to sites you trust. Connecting gives the site permission to see your wallet address.
                    </div>
                </WarningMessage>

                {externalError && (
                    <WarningMessage>
                        <Icon>
                            <ExclamationCircleIcon width={20} height={20} color="#E74C3C" />
                        </Icon>
                        <div>{externalError}</div>
                    </WarningMessage>
                )}

                <ActionButtons>
                    <Button
                        variant="reject"
                        onClick={onReject ? onReject : onClose}
                        disabled={loading}
                    >
                        <XCircleIcon width={20} height={20} />
                        {loading ? 'Processing...' : 'Reject'}
                    </Button>
                    <Button
                        variant="approve"
                        onClick={onApprove}
                        disabled={loading}
                    >
                        <CheckCircleIcon width={20} height={20} />
                        {loading ? 'Processing...' : 'Connect'}
                    </Button>
                </ActionButtons>
            </RequestContainer>
        );
    }

    // Transaction request UI
    return (
        <RequestContainer>
            <RequestHeader>
                <Icon>
                    <ShieldExclamationIcon width={28} height={28} color="#F39C12" />
                </Icon>
                <div>
                    <Title>Transaction Request</Title>
                    <Description>This site is requesting to make a transaction</Description>
                </div>
            </RequestHeader>

            <WebsiteInfo>
                <SiteIcon>
                    <GlobeAltIcon width={20} height={20} color="#FFF" />
                </SiteIcon>
                <SiteDetails>
                    <SiteName>{getDomainName(origin)}</SiteName>
                    <SiteUrl>{origin}</SiteUrl>
                </SiteDetails>
            </WebsiteInfo>

            <DataSection>
                <DataRow>
                    <DataLabel>From</DataLabel>
                    <DataValue mono={true}>
                        <FormattedAddress address={walletAddress} />
                    </DataValue>
                </DataRow>

                <DataRow>
                    <DataLabel>To</DataLabel>
                    <DataValue mono={true}>
                        <FormattedAddress address={transaction?.to} />
                    </DataValue>
                </DataRow>

                {transaction?.value && (
                    <DataRow>
                        <DataLabel>Amount</DataLabel>
                        <DataValue>
                            {formatValue(transaction.value)} ETH
                        </DataValue>
                    </DataRow>
                )}

                <DataRow>
                    <DataLabel>Network</DataLabel>
                    <DataValue>
                        {transaction?.chainId ? `Chain ID: ${transaction.chainId}` : 'Current Network'}
                    </DataValue>
                </DataRow>
            </DataSection>

            <WarningMessage>
                <Icon>
                    <ExclamationCircleIcon width={20} height={20} color="#E74C3C" />
                </Icon>
                <div>
                    Make sure you trust this site. Approving will trigger a blockchain transaction which cannot be reversed.
                </div>
            </WarningMessage>

            {externalError && (
                <WarningMessage>
                    <Icon>
                        <ExclamationCircleIcon width={20} height={20} color="#E74C3C" />
                    </Icon>
                    <div>{externalError}</div>
                </WarningMessage>
            )}

            <ActionButtons>
                <Button variant="reject" onClick={onReject} disabled={loading}>
                    <XCircleIcon width={20} height={20} />
                    {loading ? 'Processing...' : 'Reject'}
                </Button>
                <Button variant="danger" onClick={onApprove} disabled={loading}>
                    <CheckCircleIcon width={20} height={20} />
                    {loading ? 'Processing...' : 'Approve'}
                </Button>
            </ActionButtons>
        </RequestContainer>
    );
};

export default RequestApproval; 