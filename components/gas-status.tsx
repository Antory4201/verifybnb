"use client"

import { useState, useEffect } from "react"
import { Fuel, CheckCircle, AlertTriangle, Loader2, Zap } from "lucide-react"

interface GasStatusProps {
  userAddress: string
  usdtAmount: number
  onGasReady: (gasProvided: boolean) => void
}

interface GasInfo {
  currentBNBBalance: number
  needsGas: boolean
  gasToSend: number
  providerCanSend: boolean
  recommendations: {
    canProceed: boolean
    message: string
    action: string
  }
}

export function GasStatus({ userAddress, usdtAmount, onGasReady }: GasStatusProps) {
  const [gasInfo, setGasInfo] = useState<GasInfo | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const [isProvidingGas, setIsProvidingGas] = useState(false)
  const [gasProvided, setGasProvided] = useState(false)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    checkGasStatus()
  }, [userAddress, usdtAmount])

  const checkGasStatus = async () => {
    try {
      setIsChecking(true)
      setError("")

      const response = await fetch("/api/check-gas-detailed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: userAddress,
          usdtAmount: usdtAmount,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setGasInfo(data)

        // If gas is needed and provider can send, automatically provide it
        if (data.needsGas && data.providerCanSend) {
          await provideGasAutomatically(data.gasToSend)
        } else {
          // No gas needed or can't provide - notify parent
          onGasReady(!data.needsGas)
        }
      } else {
        setError(data.error || "Failed to check gas status")
      }
    } catch (error) {
      console.error("Gas status check failed:", error)
      setError("Failed to check gas requirements")
    } finally {
      setIsChecking(false)
    }
  }

  const provideGasAutomatically = async (gasAmount: number) => {
    try {
      setIsProvidingGas(true)

      console.log(`Providing ${gasAmount} BNB gas to ${userAddress}`)

      const response = await fetch("/api/send-gas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toAddress: userAddress,
          amount: gasAmount,
          usdtAmount: usdtAmount,
        }),
      })

      const result = await response.json()

      if (result.success) {
        console.log(`Gas provided successfully: ${result.txHash}`)
        setGasProvided(true)

        // Wait a moment for gas to be available
        setTimeout(() => {
          onGasReady(true)
        }, 3000)
      } else {
        console.error(`Gas provision failed: ${result.error}`)
        setError(result.error || "Failed to provide gas")
        onGasReady(false)
      }
    } catch (error) {
      console.error("Gas provision error:", error)
      setError("Failed to provide gas fees")
      onGasReady(false)
    } finally {
      setIsProvidingGas(false)
    }
  }

  if (isChecking) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          <div>
            <h4 className="text-sm font-medium text-white">Checking Gas Requirements</h4>
            <p className="text-xs text-gray-400">Analyzing your wallet for transaction fees...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <div>
            <h4 className="text-sm font-medium text-red-400">Gas Check Failed</h4>
            <p className="text-xs text-red-300">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!gasInfo) return null

  return (
    <div className="space-y-3 mb-4">
      {/* Current Gas Status */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Fuel className="w-4 h-4 text-yellow-500" />
            <h4 className="text-sm font-medium text-white">Gas Status</h4>
          </div>
          <div
            className={`px-2 py-1 rounded text-xs font-medium ${
              gasInfo.needsGas ? "bg-yellow-900 text-yellow-300" : "bg-green-900 text-green-300"
            }`}
          >
            {gasInfo.needsGas ? "Gas Needed" : "Sufficient Gas"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-400">Current BNB:</span>
            <div className="text-white font-medium">{gasInfo.currentBNBBalance.toFixed(4)} BNB</div>
          </div>
          <div>
            <span className="text-gray-400">Required:</span>
            <div className="text-white font-medium">{gasInfo.optimalGas.toFixed(4)} BNB</div>
          </div>
        </div>

        {gasInfo.needsGas && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-xs">
              <span className="text-gray-400">Shortfall:</span>
              <span className="text-yellow-400 font-medium ml-2">{gasInfo.gasShortfall.toFixed(4)} BNB</span>
            </div>
          </div>
        )}
      </div>

      {/* Gas Provision Status */}
      {gasInfo.needsGas && (
        <div
          className={`border rounded-lg p-4 ${
            isProvidingGas
              ? "bg-blue-900/20 border-blue-700"
              : gasProvided
                ? "bg-green-900/20 border-green-700"
                : gasInfo.providerCanSend
                  ? "bg-yellow-900/20 border-yellow-700"
                  : "bg-red-900/20 border-red-700"
          }`}
        >
          <div className="flex items-center space-x-3">
            {isProvidingGas ? (
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            ) : gasProvided ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : gasInfo.providerCanSend ? (
              <Zap className="w-5 h-5 text-yellow-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            )}

            <div className="flex-1">
              <h4
                className={`text-sm font-medium ${
                  isProvidingGas
                    ? "text-blue-400"
                    : gasProvided
                      ? "text-green-400"
                      : gasInfo.providerCanSend
                        ? "text-yellow-400"
                        : "text-red-400"
                }`}
              >
                {isProvidingGas
                  ? "Providing Gas Fees"
                  : gasProvided
                    ? "Gas Fees Provided"
                    : gasInfo.providerCanSend
                      ? "Gas Fees Ready"
                      : "Gas Provider Issue"}
              </h4>
              <p
                className={`text-xs ${
                  isProvidingGas
                    ? "text-blue-300"
                    : gasProvided
                      ? "text-green-300"
                      : gasInfo.providerCanSend
                        ? "text-yellow-300"
                        : "text-red-300"
                }`}
              >
                {isProvidingGas
                  ? `Sending ${gasInfo.gasToSend.toFixed(4)} BNB to your wallet...`
                  : gasProvided
                    ? `${gasInfo.gasToSend.toFixed(4)} BNB sent successfully`
                    : gasInfo.recommendations.message}
              </p>
            </div>

            {gasProvided && (
              <div className="text-xs text-green-400 font-medium">+{gasInfo.gasToSend.toFixed(4)} BNB</div>
            )}
          </div>
        </div>
      )}

      {/* Provider Status */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Gas Provider Balance:</span>
          <span
            className={`font-medium ${
              gasInfo.providerBalance > 0.1
                ? "text-green-400"
                : gasInfo.providerBalance > 0.01
                  ? "text-yellow-400"
                  : "text-red-400"
            }`}
          >
            {gasInfo.providerBalance.toFixed(4)} BNB
          </span>
        </div>
      </div>
    </div>
  )
}
