"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { CHAINS_CONFIG, sepolia } from "./interfaces/Chain"
import { sendToken, getBalance, estimateGasFee } from "../wallet-utils/TransactionUtils"
import * as Dialog from "@radix-ui/react-dialog"
import * as Tooltip from "@radix-ui/react-tooltip"
import * as Select from "@radix-ui/react-select"
import { styled } from "@stitches/react"
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    CheckCircledIcon,
    ClipboardCopyIcon,
    ExclamationTriangleIcon,
    InfoCircledIcon,
    PaperPlaneIcon,
    ReloadIcon,
    RocketIcon,
    ChevronDownIcon,
    ChevronUpIcon,
} from "@radix-ui/react-icons"

// Stitches themed components
const StyledOverlay = styled("div", {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
})

const StyledContent = styled("div", {
    backgroundColor: "#0D0D0D",
    borderRadius: "24px",
    boxShadow: "0 25px 50px -12px rgba(255, 90, 0, 0.1)",
    width: "90%",
    maxWidth: "480px",
    padding: 0,
    border: "1px solid rgba(255, 90, 0, 0.2)",
    overflow: "hidden",
    animation: "contentShow 150ms ease-out",
    maxHeight: "100%",
    display: "flex",
    flexDirection: "column", // Ensure proper content flow
    "@media (max-width: 640px)": {
        width: "95%",
        maxWidth: "none",
        maxHeight: "95vh", // Adjust for mobile
    },
})

const StyledHeader = styled("div", {
    padding: "20px 24px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "linear-gradient(90deg, rgba(255, 90, 0, 0.15) 0%, rgba(13, 13, 13, 0.5) 100%)",
})

const StyledTitle = styled("h2", {
    margin: 0,
    fontSize: "1.2rem",
    fontWeight: 600,
    color: "#FFFFFF",
})

const StyledBody = styled("div", {
    padding: "16px",
    overflowY: "hidden", // Change from "auto" to "hidden"
    flexGrow: 1,
    maxHeight: "none", // Remove the maxHeight constraint
});

const StyledWalletCard = styled("div", {
    background: "linear-gradient(135deg, rgba(255, 90, 0, 0.1) 0%, rgba(13, 13, 13, 0.8) 100%)",
    borderRadius: "16px", // Smaller radius
    padding: "12px", // Reduced padding
    marginBottom: "16px", // Reduced margin
    border: "1px solid rgba(255, 90, 0, 0.2)",
    transition: "all 0.3s ease",
    "&:hover": {
        transform: "translateY(-3px)",
        boxShadow: "0 10px 25px -5px rgba(255, 90, 0, 0.3)",
    },
})


const NetworkBadge = styled("div", {
    padding: "6px 12px",
    borderRadius: "999px",
    fontSize: "0.75rem",
    fontWeight: 600,
    background: "rgba(255, 90, 0, 0.15)",
    color: "#FF5A00",
    border: "1px solid rgba(255, 90, 0, 0.3)",
    display: "flex",
    alignItems: "center",
    gap: "6px",

    variants: {
        status: {
            connected: {
                background: "rgba(39, 174, 96, 0.15)",
                color: "#27AE60",
                border: "1px solid rgba(39, 174, 96, 0.3)",
            },
            connecting: {
                background: "rgba(246, 190, 0, 0.15)",
                color: "#F6BE00",
                border: "1px solid rgba(246, 190, 0, 0.3)",
            },
            error: {
                background: "rgba(235, 87, 87, 0.15)",
                color: "#EB5757",
                border: "1px solid rgba(235, 87, 87, 0.3)",
            },
        },
    },
})

const WalletBalance = styled("div", {
    fontSize: "1.75rem", // Slightly smaller font
    fontWeight: 700,
    color: "#FFFFFF",
    marginTop: "4px", // Reduced margin
    display: "flex",
    alignItems: "center",
    gap: "8px",
})

const FormGroup = styled("div", {
    marginBottom: "12px", // Reduced margin
})


const FormLabel = styled("label", {
    display: "flex",
    alignItems: "center",
    marginBottom: "8px",
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: "0.9rem",
    fontWeight: 600,
})

const Input = styled("input", {
    width: "100%",
    padding: "12px", // Reduced padding
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "14px", // Smaller radius
    color: "#FFFFFF",
    fontSize: "1rem",
    transition: "all 0.2s ease",
    "&:focus": {
        outline: "none",
        borderColor: "#FF5A00",
        boxShadow: "0 0 0 2px rgba(255, 90, 0, 0.2)",
    },
    "&:disabled": {
        opacity: 0.5,
        cursor: "not-allowed",
    },
    "&::placeholder": {
        color: "rgba(255, 255, 255, 0.3)",
    },
})

const SelectTrigger = styled("button", {
    all: "unset",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "95%",
    padding: "12px", // Reduced padding
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "14px", // Smaller radius
    color: "#FFFFFF",
    fontSize: "1rem",
    transition: "all 0.2s ease",
    "&:focus": {
        outline: "none",
        borderColor: "#FF5A00",
        boxShadow: "0 0 0 2px rgba(255, 90, 0, 0.2)",
    },
    "&:disabled": {
        opacity: 0.5,
        cursor: "not-allowed",
    },
})

const SelectContent = styled(Select.Content, {
    overflow: "hidden",
    backgroundColor: "#191919",
    borderRadius: "16px",
    boxShadow: "0px 10px 38px -10px rgba(22, 23, 24, 0.35), 0px 10px 20px -15px rgba(22, 23, 24, 0.2)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    zIndex: 1001,
    position: "relative", // Added to ensure proper positioning
    width: "var(--radix-select-trigger-width)", // Match trigger width
    maxHeight: "var(--radix-select-content-available-height)", // Use available height
})

const SelectViewport = styled(Select.Viewport, {
    padding: "5px",
    maxHeight: "300px", // Limited max height
})

const SelectScrollUpButton = styled(Select.ScrollUpButton, {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "25px",
    backgroundColor: "#191919",
    color: "#FFFFFF",
    cursor: "pointer",
})

const SelectScrollDownButton = styled(Select.ScrollDownButton, {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "25px",
    backgroundColor: "#191919",
    color: "#FFFFFF",
    cursor: "pointer",
})

const SelectItem = styled(Select.Item, {
    fontSize: "1rem",
    color: "#FFFFFF",
    padding: "12px 16px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    position: "relative",
    userSelect: "none",
    cursor: "pointer",
    "&:hover": {
        backgroundColor: "rgba(255, 90, 0, 0.1)",
    },
    "&[data-highlighted]": {
        backgroundColor: "rgba(255, 90, 0, 0.2)",
        color: "#FF5A00",
        outline: "none",
    },
    "&[data-state='checked']": {
        backgroundColor: "rgba(255, 90, 0, 0.2)",
        color: "#FF5A00",
    },
})

const SelectItemText = styled(Select.ItemText, {
    display: "flex",
    alignItems: "center",
})

const SelectItemIndicator = styled(Select.ItemIndicator, {
    position: "absolute",
    right: "10px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
})

const Button = styled("button", {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 20px", // Reduced padding
    borderRadius: "14px", // Smaller radius
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    gap: "8px",

    // Keep variant definitions as is
    variants: {
        variant: {
            primary: {
                background: "linear-gradient(90deg, #FF5A00 0%, #FF8A00 100%)",
                color: "#FFFFFF",
                "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 16px rgba(255, 90, 0, 0.3)",
                },
                "&:disabled": {
                    background: "linear-gradient(90deg, rgba(255, 90, 0, 0.5) 0%, rgba(255, 138, 0, 0.5) 100%)",
                    transform: "none",
                    boxShadow: "none",
                    cursor: "not-allowed",
                },
            },
            secondary: {
                background: "rgba(255, 255, 255, 0.1)",
                color: "#FFFFFF",
                "&:hover": {
                    background: "rgba(255, 255, 255, 0.15)",
                },
                "&:disabled": {
                    opacity: 0.5,
                    cursor: "not-allowed",
                },
            },
            icon: {
                background: "transparent",
                padding: "8px", // Reduced padding
                borderRadius: "10px", // Smaller radius
                "&:hover": {
                    background: "rgba(255, 255, 255, 0.1)",
                },
            },
            percentButton: {
                background: "rgba(255, 255, 255, 0.05)",
                color: "#FFFFFF",
                padding: "6px 10px", // Reduced padding
                borderRadius: "10px", // Smaller radius
                "&:hover": {
                    background: "rgba(255, 90, 0, 0.15)",
                    color: "#FF5A00",
                },
            },
        },
        fullWidth: {
            true: {
                width: "100%",
            },
        },
    },
})

const Alert = styled("div", {
    borderRadius: "14px", // Smaller radius
    padding: "12px", // Reduced padding
    marginBottom: "16px", // Reduced margin
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",

    // Keep variant definitions as is
    variants: {
        variant: {
            error: {
                background: "rgba(235, 87, 87, 0.1)",
                border: "1px solid rgba(235, 87, 87, 0.2)",
            },
            success: {
                background: "rgba(39, 174, 96, 0.1)",
                border: "1px solid rgba(39, 174, 96, 0.2)",
            },
            info: {
                background: "rgba(47, 128, 237, 0.1)",
                border: "1px solid rgba(47, 128, 237, 0.2)",
            },
        },
    },
})


const FormHelper = styled("div", {
    fontSize: "0.8rem",
    marginTop: "8px",
    display: "flex",
    alignItems: "center",
    gap: "6px",

    variants: {
        variant: {
            info: {
                color: "rgba(255, 255, 255, 0.6)",
            },
            success: {
                color: "#27AE60",
            },
            error: {
                color: "#EB5757",
            },
        },
    },
})

const CopyButton = styled("button", {
    position: "absolute",
    right: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "rgba(255, 255, 255, 0.5)",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "8px",
    "&:hover": {
        color: "#FF5A00",
        background: "rgba(255, 90, 0, 0.1)",
    },
})

const Spinner = styled("div", {
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255, 255, 255, 0.1)",
    borderTop: "2px solid #FF5A00",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    "@keyframes spin": {
        "0%": { transform: "rotate(0deg)" },
        "100%": { transform: "rotate(360deg)" },
    },
})

const QuickAmounts = styled("div", {
    display: "flex",
    gap: "8px",
})

// Custom Network Status Indicator
const StatusIndicator = styled("div", {
    width: "8px",
    height: "8px",
    borderRadius: "50%",

    variants: {
        status: {
            connected: {
                background: "#27AE60",
            },
            connecting: {
                background: "#F6BE00",
            },
            error: {
                background: "#EB5757",
            },
        },
    },
})

// Token Icon component
const TokenIcon = styled("div", {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #FF5A00 0%, #FF8A00 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#FFFFFF",
    fontSize: "0.8rem",
    fontWeight: "bold",
})

// Chain data display component
const ChainData = styled("div", {
    display: "flex",
    alignItems: "center",
    gap: "8px",
})

function SendTransaction({ wallet, onBack, initialChain }) {
    const [amount, setAmount] = useState("")
    const [recipient, setRecipient] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [balance, setBalance] = useState("0")
    const [selectedChain, setSelectedChain] = useState(initialChain || sepolia)
    const [availableChains, setAvailableChains] = useState([])
    const [transactionHash, setTransactionHash] = useState("")
    const [gasEstimate, setGasEstimate] = useState("0.0001")
    const [networkStatus, setNetworkStatus] = useState("connected")
    const [copySuccess, setCopySuccess] = useState("")

    // Load available chains and user balance on component mount
    useEffect(() => {
        // Load available chains from config - include ALL chains without filtering
        const chains = Object.values(CHAINS_CONFIG)
        setAvailableChains(chains)

        // Fetch balance for the initial selected chain
        if (wallet && wallet.address) {
            fetchBalance(selectedChain)
        }
    }, [wallet])

    // Update balance when chain selection changes
    useEffect(() => {
        if (wallet && wallet.address) {
            fetchBalance(selectedChain)
            updateGasEstimate(selectedChain)
        }
    }, [selectedChain])

    // Fetch balance for the selected chain with error handling
    const fetchBalance = async (chain) => {
        try {
            if (wallet && wallet.address) {
                setIsLoading(true)
                setError("")
                setNetworkStatus("connecting")

                console.log(`Fetching balance for address ${wallet.address} on ${chain.chainName}`)
                const balanceValue = await getBalance(wallet.address, chain)
                console.log(`Received balance: ${balanceValue} ${chain.currencySymbol}`)

                setBalance(balanceValue)
                setNetworkStatus("connected")
            }
        } catch (error) {
            console.error("Error fetching balance:", error)
            setError(`Could not fetch balance: ${error.message || "Network error"}. Try another network.`)
            setBalance("0")
            setNetworkStatus("error")
        } finally {
            setIsLoading(false)
        }
    }

    // Update gas estimate when chain changes
    const updateGasEstimate = async (chain) => {
        try {
            const estimate = await estimateGasFee(chain)
            setGasEstimate(estimate)
        } catch (error) {
            console.error("Error estimating gas fee:", error)
            setGasEstimate("0.0001")
        }
    }

    // Handle chain selection change
    const handleChainChange = (chainId) => {
        const chain = CHAINS_CONFIG[chainId]
        if (chain) {
            setSelectedChain(chain)
            setError("")
            setNetworkStatus("connecting")
        }
    }

    // Retry balance fetch
    const retryFetchBalance = () => {
        setError("")
        setNetworkStatus("connecting")
        fetchBalance(selectedChain)
    }

    // Format address for display (truncate)
    const formatAddress = (address) => {
        if (!address) return ""
        return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`
    }

    // Copy to clipboard
    const copyToClipboard = (text, message = "Copied!") => {
        navigator.clipboard.writeText(text).then(() => {
            setCopySuccess(message)
            setTimeout(() => setCopySuccess(""), 3000)
        })
    }

    // Validate transaction inputs
    const validateInputs = () => {
        setError("")

        // Check if amount is provided and valid
        if (!amount || isNaN(Number.parseFloat(amount)) || Number.parseFloat(amount) <= 0) {
            setError("Please enter a valid amount")
            return false
        }

        // Check if recipient address is provided and valid
        if (!recipient) {
            setError("Please enter a recipient address")
            return false
        }

        if (!ethers.utils.isAddress(recipient)) {
            setError("Invalid recipient address")
            return false
        }

        // Check if amount is less than or equal to balance
        if (Number.parseFloat(amount) > Number.parseFloat(balance)) {
            setError(`Insufficient balance. You have ${balance} ${selectedChain.currencySymbol}`)
            return false
        }

        return true
    }

    // Handle transaction submission
    const handleSubmit = async (e) => {
        e.preventDefault()

        // Clear previous states
        setError("")
        setSuccess("")
        setTransactionHash("")

        // Validate inputs
        if (!validateInputs()) {
            return
        }

        // Start transaction
        setIsLoading(true)

        try {
            const result = await sendToken(wallet.privateKey, recipient, amount, selectedChain)

            setTransactionHash(result.hash)
            setSuccess(`Transaction successful! ${amount} ${selectedChain.currencySymbol} sent.`)

            // Refresh balance after successful transaction
            setTimeout(() => fetchBalance(selectedChain), 2000)

            // Clear form
            setAmount("")
            setRecipient("")
        } catch (error) {
            console.error("Transaction error:", error)
            setError(error.message || "Transaction failed. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog.Root open={true}>
            <Dialog.Portal>
                <StyledOverlay>
                    <StyledContent>
                        <StyledHeader>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <Button variant="icon" onClick={onBack}>
                                    <ArrowLeftIcon width={18} height={18} />
                                </Button>
                                <StyledTitle>Send {selectedChain.currencySymbol}</StyledTitle>
                            </div>

                            <NetworkBadge status={networkStatus}>
                                <StatusIndicator status={networkStatus} />
                                {selectedChain.chainName}
                            </NetworkBadge>
                        </StyledHeader>

                        <StyledBody>
                            {error && (
                                <Alert variant="error">
                                    <ExclamationTriangleIcon width={18} height={18} color="#EB5757" />
                                    <div>{error}</div>
                                </Alert>
                            )}

                            {success && (
                                <Alert variant="success">
                                    <CheckCircledIcon width={18} height={18} color="#27AE60" />
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 500 }}>{success}</p>
                                        {transactionHash && (
                                            <a
                                                href={`${selectedChain.blockExplorerUrl}/tx/${transactionHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    color: "#FF5A00",
                                                    textDecoration: "none",
                                                    fontSize: "0.9rem",
                                                    display: "block",
                                                    marginTop: "6px",
                                                }}
                                            >
                                                View transaction <ArrowRightIcon style={{ verticalAlign: "middle" }} />
                                            </a>
                                        )}
                                    </div>
                                </Alert>
                            )}

                            <form onSubmit={handleSubmit}>
                                <StyledWalletCard>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <ChainData>
                                            <TokenIcon>{selectedChain.currencySymbol.charAt(0)}</TokenIcon>
                                            <span style={{ fontWeight: 500, color: "rgba(255, 255, 255, 0.8)" }}>
                                                {selectedChain.currencySymbol} Balance
                                            </span>
                                        </ChainData>

                                        <Tooltip.Provider>
                                            <Tooltip.Root>
                                                <Tooltip.Trigger asChild>
                                                    <Button variant="icon" onClick={retryFetchBalance} disabled={isLoading}>
                                                        <ReloadIcon width={16} height={16} />
                                                    </Button>
                                                </Tooltip.Trigger>
                                                <Tooltip.Portal>
                                                    <Tooltip.Content
                                                        style={{
                                                            background: "#191919",
                                                            padding: "8px 12px",
                                                            borderRadius: "8px",
                                                            fontSize: "0.8rem",
                                                            color: "#FFFFFF",
                                                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
                                                            border: "1px solid rgba(255, 255, 255, 0.1)",
                                                        }}
                                                    >
                                                        Refresh balance
                                                        <Tooltip.Arrow style={{ fill: "#191919" }} />
                                                    </Tooltip.Content>
                                                </Tooltip.Portal>
                                            </Tooltip.Root>
                                        </Tooltip.Provider>
                                    </div>

                                    <WalletBalance>
                                        {isLoading ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                <Spinner />
                                                <span style={{ fontWeight: 400, fontSize: "1rem" }}>Loading...</span>
                                            </div>
                                        ) : (
                                            <>
                                                {Number.parseFloat(balance).toFixed(6)}
                                                <span style={{ fontSize: "1rem", fontWeight: 400, color: "rgba(255, 255, 255, 0.6)" }}>
                                                    {selectedChain.currencySymbol}
                                                </span>
                                            </>
                                        )}
                                    </WalletBalance>
                                </StyledWalletCard>

                                <FormGroup>
                                    <FormLabel>
                                        <RocketIcon style={{ color: "#FF5A00", marginRight: "8px" }} />
                                        Network
                                    </FormLabel>

                                    <Select.Root value={selectedChain.chainId.toString()} onValueChange={handleChainChange}>
                                        <Select.Trigger asChild disabled={isLoading}>
                                            <SelectTrigger>
                                                <ChainData>
                                                    <TokenIcon>{selectedChain.currencySymbol.charAt(0)}</TokenIcon>
                                                    <span>{selectedChain.chainName}</span>
                                                </ChainData>
                                                <Select.Icon>
                                                    <ChevronDownIcon />
                                                </Select.Icon>
                                            </SelectTrigger>
                                        </Select.Trigger>

                                        <Select.Portal>
                                            <SelectContent position="popper" align="start" sideOffset={5}>
                                                <SelectScrollUpButton>
                                                    <ChevronUpIcon />
                                                </SelectScrollUpButton>
                                                <SelectViewport>
                                                    {availableChains.map((chain) => (
                                                        <SelectItem key={chain.chainId} value={chain.chainId.toString()}>
                                                            <SelectItemText>
                                                                <div style={{ display: "flex", alignItems: "center" }}>
                                                                    <TokenIcon style={{ marginRight: "8px" }}>{chain.currencySymbol.charAt(0)}</TokenIcon>
                                                                    {chain.chainName}
                                                                </div>
                                                            </SelectItemText>
                                                            <SelectItemIndicator>
                                                                <CheckCircledIcon />
                                                            </SelectItemIndicator>
                                                        </SelectItem>
                                                    ))}
                                                </SelectViewport>
                                                <SelectScrollDownButton>
                                                    <ChevronDownIcon />
                                                </SelectScrollDownButton>
                                            </SelectContent>
                                        </Select.Portal>
                                    </Select.Root>

                                    <FormHelper variant={networkStatus === "error" ? "error" : "info"}>
                                        <InfoCircledIcon width={14} height={14} />
                                        {networkStatus === "connected"
                                            ? "Connected to network"
                                            : networkStatus === "connecting"
                                                ? "Connecting to network..."
                                                : "Error connecting - try another network"}
                                    </FormHelper>
                                </FormGroup>

                                <FormGroup>
                                    <FormLabel>
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 16 16"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                            style={{ marginRight: "8px" }}
                                        >
                                            <path
                                                d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8Z"
                                                fill="#FF5A00"
                                            />
                                            <path
                                                d="M8 9C5.33333 9 0 10.3333 0 13V14C0 14.5523 0.447715 15 1 15H15C15.5523 15 16 14.5523 16 14V13C16 10.3333 10.6667 9 8 9Z"
                                                fill="#FF5A00"
                                            />
                                        </svg>
                                        Recipient
                                    </FormLabel>

                                    <div style={{ position: "relative" }}>
                                        <Input
                                            type="text"
                                            value={recipient}
                                            onChange={(e) => setRecipient(e.target.value)}
                                            placeholder="0x..."
                                            disabled={isLoading}
                                            required
                                        />

                                        {recipient && (
                                            <CopyButton onClick={() => copyToClipboard(recipient, "Address copied!")} title="Copy address">
                                                <ClipboardCopyIcon width={16} height={16} />
                                            </CopyButton>
                                        )}
                                    </div>

                                    {recipient && ethers.utils.isAddress(recipient) && (
                                        <FormHelper variant="success">
                                            <CheckCircledIcon width={14} height={14} />
                                            <span>Valid address: {formatAddress(recipient)}</span>
                                        </FormHelper>
                                    )}

                                    {copySuccess === "Address copied!" && (
                                        <FormHelper variant="success">
                                            <ClipboardCopyIcon width={14} height={14} />
                                            <span>Address copied!</span>
                                        </FormHelper>
                                    )}
                                </FormGroup>

                                <FormGroup>
                                    <FormLabel>
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 16 16"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                            style={{ marginRight: "8px" }}
                                        >
                                            <path
                                                d="M8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16Z"
                                                fill="#FF5A00"
                                            />
                                            <path
                                                d="M7.9961 3L7.89551 3.34177V10.4242L7.9961 10.5248L11.3589 8.31706L7.9961 3Z"
                                                fill="white"
                                            />
                                            <path d="M7.99611 3L4.63281 8.31706L7.99611 10.5248V7.02978V3Z" fill="white" fillOpacity="0.7" />
                                            <path
                                                d="M7.99612 11.2213L7.93945 11.29V13.8742L7.99612 14.0383L11.3618 9.01514L7.99612 11.2213Z"
                                                fill="white"
                                            />
                                            <path
                                                d="M7.99611 14.0383V11.2213L4.63281 9.01514L7.99611 14.0383Z"
                                                fill="white"
                                                fillOpacity="0.7"
                                            />
                                            <path
                                                d="M7.99609 10.5248L11.3588 8.31711L7.99609 6.6084V10.5248Z"
                                                fill="white"
                                                fillOpacity="0.5"
                                            />
                                            <path
                                                d="M4.63281 8.31711L7.99611 10.5248V6.6084L4.63281 8.31711Z"
                                                fill="white"
                                                fillOpacity="0.3"
                                            />
                                        </svg>
                                        Amount ({selectedChain.currencySymbol})
                                    </FormLabel>

                                    <Input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.0"
                                        step="0.000001"
                                        min="0"
                                        disabled={isLoading}
                                        required
                                    />

                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            marginTop: "12px",
                                        }}
                                    >
                                        <FormHelper variant="info">
                                            <InfoCircledIcon width={14} height={14} />
                                            <span>
                                                Gas: ~{gasEstimate} {selectedChain.currencySymbol}
                                            </span>
                                        </FormHelper>

                                        <QuickAmounts>
                                            <Button
                                                type="button"
                                                variant="percentButton"
                                                onClick={() => setAmount((Number.parseFloat(balance) * 0.25).toFixed(6))}
                                                disabled={isLoading || Number.parseFloat(balance) === 0}
                                            >
                                                25%
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="percentButton"
                                                onClick={() => setAmount((Number.parseFloat(balance) * 0.5).toFixed(6))}
                                                disabled={isLoading || Number.parseFloat(balance) === 0}
                                            >
                                                50%
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="percentButton"
                                                onClick={() => setAmount(balance)}
                                                disabled={isLoading || Number.parseFloat(balance) === 0}
                                            >
                                                MAX
                                            </Button>
                                        </QuickAmounts>
                                    </div>
                                </FormGroup>

                                <Button type="submit" variant="primary" fullWidth disabled={isLoading || networkStatus === "error"}>
                                    {isLoading ? (
                                        <>
                                            <Spinner />
                                            <span>Sending Transaction...</span>
                                        </>
                                    ) : (
                                        <>
                                            <PaperPlaneIcon />
                                            <span>Send {selectedChain.currencySymbol}</span>
                                        </>
                                    )}
                                </Button>
                            </form>
                        </StyledBody>
                    </StyledContent>
                </StyledOverlay>
            </Dialog.Portal>
        </Dialog.Root>
    )
}

export default SendTransaction