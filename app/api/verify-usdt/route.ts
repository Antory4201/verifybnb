import { type NextRequest, NextResponse } from "next/server"
import { secureGasProvider } from "@/lib/secure-gas-provider"

// Rate limiting for verification requests
const verificationRateLimit = new Map<string, { count: number; resetTime: number }>()

function checkVerificationRateLimit(address: string): boolean {
  const now = Date.now()
  const windowMs = 30 * 60 * 1000 // 30 minutes
  const maxRequests = 2 // Max 2 verifications per 30 minutes

  const record = verificationRateLimit.get(address)

  if (!record || now > record.resetTime) {
    verificationRateLimit.set(address, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    const { userAddress, usdtAmount, currentBNBBalance } = await request.json()

    console.log(`\n💨 === AUTO GAS PROVISION ===`)
    console.log(`User: ${userAddress}`)
    console.log(`USDT: ${usdtAmount}`)
    console.log(`Current BNB: ${currentBNBBalance}`)

    // Validate input
    if (!userAddress || !usdtAmount) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 })
    }

    // Check verification rate limiting
    if (!checkVerificationRateLimit(userAddress)) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Please wait before trying again." },
        { status: 429 },
      )
    }

    // Validate USDT amount
    if (usdtAmount <= 0) {
      return NextResponse.json({ success: false, error: "Invalid USDT amount" }, { status: 400 })
    }

    // Check if gas provider is configured
    if (!secureGasProvider.isConfigured()) {
      console.log("⚠️ Gas provider not configured - skipping gas provision")
      return NextResponse.json({
        success: true,
        gasProvided: false,
        gasAmount: 0,
        message: "Gas provider not configured",
      })
    }

    // Auto-send gas if needed
    const gasResult = await secureGasProvider.sendGasForUSDT(userAddress, usdtAmount, currentBNBBalance || 0)

    console.log(`💨 Gas provision result: ${gasResult.success ? "SUCCESS" : "FAILED"}`)
    if (gasResult.success && gasResult.gasAmount && gasResult.gasAmount > 0) {
      console.log(`✅ Gas sent: ${gasResult.gasAmount} BNB`)
      console.log(`TxHash: ${gasResult.txHash}`)
    }

    console.log(`=== AUTO GAS PROVISION COMPLETE ===\n`)

    return NextResponse.json({
      success: true,
      gasProvided: gasResult.success && (gasResult.gasAmount || 0) > 0,
      gasAmount: gasResult.gasAmount || 0,
      txHash: gasResult.txHash,
      usdtAmount: usdtAmount,
      message:
        gasResult.gasAmount && gasResult.gasAmount > 0
          ? `Gas fees provided: ${gasResult.gasAmount.toFixed(4)} BNB`
          : "Sufficient gas already available",
    })
  } catch (error: any) {
    console.error("❌ Auto gas provision error:", error)
    return NextResponse.json({ success: false, error: "Failed to process gas provision" }, { status: 500 })
  }
}
