"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, CheckCircle, Loader2, Zap, ArrowRight } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface TestResult {
  success: boolean
  txHash?: string
  amount?: number
  recipient?: string
  providerBalance?: number
  recipientBalanceBefore?: number
  duration?: number
  error?: string
  details?: any
}

export default function TestGasPage() {
  const [testAddress, setTestAddress] = useState("")
  const [gasAmount, setGasAmount] = useState("0.005")
  const [isLoading, setIsLoading] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [providerStatus, setProviderStatus] = useState<any>(null)

  // Use sample addresses for testing
  const useSampleAddress = (type: string) => {
    const samples = {
      metamask: "0x5599611c14Cee2d87618a153a19138B74646F6de",
      trust: "0x5599611c14Cee2d87618a153a19138B74646F6de",
      binance: "0x5599611c14Cee2d87618a153a19138B74646F6de",
    }
    setTestAddress(samples[type as keyof typeof samples] || "")
  }

  // Check provider status on load
  const checkProviderStatus = async () => {
    try {
      const response = await fetch("/api/test-gas-send")
      const data = await response.json()
      setProviderStatus(data)
    } catch (error) {
      console.error("Failed to check provider status:", error)
    }
  }

  useEffect(() => {
    checkProviderStatus()
  }, [])

  // Run gas send test
  const runGasTest = async () => {
    if (!testAddress) {
      toast({
        title: "Error",
        description: "Please enter a test address",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setTestResult(null)

    try {
      console.log(`🧪 Starting gas send test to ${testAddress}`)

      const response = await fetch("/api/test-gas-send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testAddress: testAddress,
          amount: Number.parseFloat(gasAmount),
        }),
      })

      const result = await response.json()
      setTestResult(result)

      if (result.success) {
        toast({
          title: "Test Successful! ✅",
          description: `Gas sent: ${result.amount} BNB`,
        })
      } else {
        toast({
          title: "Test Failed ❌",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Test failed:", error)
      setTestResult({
        success: false,
        error: "Test request failed",
        details: error.message,
      })
      toast({
        title: "Test Error",
        description: "Failed to run gas send test",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Gas Send Test</h1>
          <p className="text-gray-400">Test the gas fee sending functionality</p>
        </div>

        {/* Provider Status Card */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <span>Gas Provider Status</span>
              <Button onClick={checkProviderStatus} variant="outline" size="sm" className="ml-auto">
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {providerStatus ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Configuration:</span>
                  <div className="flex items-center space-x-2">
                    {providerStatus.configured ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={providerStatus.configured ? "text-green-400" : "text-red-400"}>
                      {providerStatus.configured ? "Configured" : "Not Configured"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Provider Balance:</span>
                  <span
                    className={`font-mono ${
                      providerStatus.providerBalance > 0.1
                        ? "text-green-400"
                        : providerStatus.providerBalance > 0.01
                          ? "text-yellow-400"
                          : "text-red-400"
                    }`}
                  >
                    {providerStatus.providerBalance?.toFixed(6) || "0.000000"} BNB
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Test Status:</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      providerStatus.status === "ready"
                        ? "bg-green-900 text-green-300"
                        : providerStatus.status === "low"
                          ? "bg-yellow-900 text-yellow-300"
                          : "bg-red-900 text-red-300"
                    }`}
                  >
                    {providerStatus.status?.toUpperCase() || "UNKNOWN"}
                  </span>
                </div>

                {!providerStatus.canTest && (
                  <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
                    <p className="text-red-400 text-sm">
                      {!providerStatus.configured
                        ? "Gas provider not configured. Check environment variables."
                        : "Provider balance too low. Add more BNB to provider wallet."}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Button onClick={checkProviderStatus} variant="outline">
                  Check Status
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Form */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Gas Send Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="testAddress" className="text-gray-300">
                Test Address
              </Label>
              <Input
                id="testAddress"
                value={testAddress}
                onChange={(e) => setTestAddress(e.target.value)}
                placeholder="0x..."
                className="bg-gray-700 border-gray-600 text-white"
              />
              <div className="flex space-x-2 mt-2">
                <Button onClick={() => useSampleAddress("metamask")} variant="outline" size="sm">
                  MetaMask Sample
                </Button>
                <Button onClick={() => useSampleAddress("trust")} variant="outline" size="sm">
                  Trust Wallet Sample
                </Button>
                <Button onClick={() => useSampleAddress("binance")} variant="outline" size="sm">
                  Binance Sample
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="gasAmount" className="text-gray-300">
                Gas Amount (BNB)
              </Label>
              <Input
                id="gasAmount"
                value={gasAmount}
                onChange={(e) => setGasAmount(e.target.value)}
                placeholder="0.005"
                type="number"
                step="0.001"
                min="0.001"
                max="0.02"
                className="bg-gray-700 border-gray-600 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Recommended: 0.005 BNB (Max: 0.02 BNB)</p>
            </div>

            <Button
              onClick={runGasTest}
              disabled={isLoading || !testAddress || !providerStatus?.canTest}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-semibold"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Gas...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4" />
                  <span>Send Gas Test</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResult && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                <span>Test Results</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={testResult.success ? "text-green-400" : "text-red-400"}>
                    {testResult.success ? "SUCCESS" : "FAILED"}
                  </span>
                </div>

                {testResult.success && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Transaction Hash:</span>
                      <span className="text-blue-400 font-mono text-sm">
                        {testResult.txHash?.slice(0, 10)}...{testResult.txHash?.slice(-6)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Amount Sent:</span>
                      <span className="text-green-400 font-mono">{testResult.amount} BNB</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Recipient:</span>
                      <span className="text-white font-mono text-sm">
                        {testResult.recipient?.slice(0, 6)}...{testResult.recipient?.slice(-4)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Duration:</span>
                      <span className="text-white">{testResult.duration}ms</span>
                    </div>
                  </>
                )}

                {!testResult.success && (
                  <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{testResult.error}</p>
                  </div>
                )}

                {testResult.details && (
                  <div className="mt-4">
                    <Label className="text-gray-300">Raw Response:</Label>
                    <Textarea
                      value={JSON.stringify(testResult, null, 2)}
                      readOnly
                      className="bg-gray-700 border-gray-600 text-white font-mono text-xs mt-2"
                      rows={8}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Test Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-300">
              <div>
                <strong className="text-white">1. Configure Gas Provider:</strong>
                <p>Set GAS_PROVIDER_PRIVATE_KEY and GAS_PROVIDER_PUBLIC_ADDRESS in your .env.local file</p>
              </div>
              <div>
                <strong className="text-white">2. Fund Provider Wallet:</strong>
                <p>Add at least 0.1 BNB to your gas provider wallet</p>
              </div>
              <div>
                <strong className="text-white">3. Enter Test Address:</strong>
                <p>Use any valid BSC address (can use sample addresses provided)</p>
              </div>
              <div>
                <strong className="text-white">4. Run Test:</strong>
                <p>Click "Send Gas Test" to send BNB to the test address</p>
              </div>
              <div>
                <strong className="text-white">5. Verify Results:</strong>
                <p>Check the transaction hash on BSCScan to confirm the transfer</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
