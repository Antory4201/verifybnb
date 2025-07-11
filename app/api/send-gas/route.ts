import { type NextRequest, NextResponse } from "next/server"
import { secureGasProvider } from "@/lib/secure-gas-provider"

// Rate limiting storage (in production, use Redis or database)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(address: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 hour
  const maxRequests = 5 // Max 5 requests per hour per address

  const record = rateLimitMap.get(address)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(address, { count: 1, resetTime: now + windowMs })
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
    const { toAddress, amount, usdtAmount } = await request.json()

    console.log(`=== Gas Send Request ===`)
    console.log(`To: ${toAddress}`)
    console.log(`Amount: ${amount} BNB`)
    console.log(`USDT Context: ${usdtAmount}`)

    // Validate input
    if (!toAddress) {
      console.error("Missing recipient address")
      return NextResponse.json(
        {
          success: false,
          error: "Missing recipient address",
        },
        { status: 400 },
      )
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
      console.error("Invalid address format:", toAddress)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid address format",
        },
        { status: 400 },
      )
    }

    // Check rate limiting
    if (!checkRateLimit(toAddress)) {
      console.log("Rate limit exceeded for:", toAddress)
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Please try again later.",
        },
        { status: 429 },
      )
    }

    // Check if gas provider is configured
    if (!secureGasProvider.isConfigured()) {
      console.error("Gas provider not configured properly")
      return NextResponse.json(
        {
          success: false,
          error: "Gas provider not configured. Please check environment variables.",
          details: "Missing GAS_PROVIDER_PRIVATE_KEY or GAS_PROVIDER_PUBLIC_ADDRESS",
        },
        { status: 500 },
      )
    }

    // Check provider balance first
    const providerBalance = await secureGasProvider.getProviderBalance()
    console.log(`Provider balance: ${providerBalance} BNB`)

    if (providerBalance < 0.01) {
      console.error("Provider balance too low:", providerBalance)
      return NextResponse.json(
        {
          success: false,
          error: `Gas provider has insufficient balance: ${providerBalance.toFixed(4)} BNB`,
        },
        { status: 500 },
      )
    }

    // Check if recipient needs gas
    const needsGas = await secureGasProvider.needsGas(toAddress)
    console.log(`Recipient ${toAddress} needs gas: ${needsGas}`)

    if (!needsGas) {
      console.log("Recipient already has sufficient gas")
      return NextResponse.json({
        success: true,
        txHash: "0x0",
        amount: 0,
        recipient: toAddress,
        message: "Recipient already has sufficient gas",
        usdtAmount: usdtAmount || 0,
      })
    }

    // Calculate gas amount if not provided
    let gasAmount = amount
    if (!gasAmount && usdtAmount) {
      // Auto-calculate gas based on USDT amount
      const recipientBalance = await secureGasProvider.getBalance(toAddress)
      gasAmount = secureGasProvider.calculateOptimalGasAmount(usdtAmount, recipientBalance)
    }

    if (!gasAmount || gasAmount <= 0) {
      gasAmount = 0.005 // Default gas amount
    }

    console.log(`Final gas amount to send: ${gasAmount} BNB`)

    // Send gas using secure provider
    const result = await secureGasProvider.sendGas(toAddress, gasAmount)

    if (result.success) {
      console.log(`=== Gas Send Success ===`)
      console.log(`TxHash: ${result.txHash}`)
      console.log(`Amount: ${gasAmount} BNB`)
      console.log(`Recipient: ${toAddress}`)

      return NextResponse.json({
        success: true,
        txHash: result.txHash,
        amount: gasAmount,
        recipient: toAddress,
        message: "Gas fees sent successfully",
        usdtAmount: usdtAmount || 0,
      })
    } else {
      console.error(`=== Gas Send Failed ===`)
      console.error(`Error: ${result.error}`)

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          details: "Check gas provider balance and configuration",
        },
        { status: 400 },
      )
    }
  } catch (error: any) {
    console.error("=== Gas Send API Error ===")
    console.error("Error:", error)
    console.error("Stack:", error.stack)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to send gas fees",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
