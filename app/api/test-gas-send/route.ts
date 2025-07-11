import { type NextRequest, NextResponse } from "next/server"
import { secureGasProvider } from "@/lib/secure-gas-provider"

export async function POST(request: NextRequest) {
  try {
    const { testAddress, amount } = await request.json()

    console.log(`\n🧪 === GAS SEND TEST STARTED ===`)
    console.log(`Test Address: ${testAddress}`)
    console.log(`Amount: ${amount || "auto"} BNB`)
    console.log(`Timestamp: ${new Date().toISOString()}`)

    // Validate test address
    if (!testAddress) {
      return NextResponse.json({ success: false, error: "Test address required" }, { status: 400 })
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(testAddress)) {
      return NextResponse.json({ success: false, error: "Invalid address format" }, { status: 400 })
    }

    // Check gas provider configuration
    console.log("🔧 Checking gas provider configuration...")
    if (!secureGasProvider.isConfigured()) {
      console.error("❌ Gas provider not configured")
      return NextResponse.json(
        {
          success: false,
          error: "Gas provider not configured",
          details: "Check GAS_PROVIDER_PRIVATE_KEY and GAS_PROVIDER_PUBLIC_ADDRESS environment variables",
        },
        { status: 500 },
      )
    }
    console.log("✅ Gas provider configured")

    // Check provider balance
    console.log("💰 Checking provider balance...")
    const providerBalance = await secureGasProvider.getProviderBalance()
    console.log(`Provider Balance: ${providerBalance.toFixed(6)} BNB`)

    if (providerBalance < 0.01) {
      console.error("❌ Provider balance too low")
      return NextResponse.json(
        {
          success: false,
          error: `Provider balance too low: ${providerBalance.toFixed(6)} BNB`,
          details: "Provider needs at least 0.01 BNB to send gas",
        },
        { status: 500 },
      )
    }
    console.log("✅ Provider has sufficient balance")

    // Check recipient current balance
    console.log("🔍 Checking recipient balance...")
    const recipientBalance = await secureGasProvider.getBalance(testAddress)
    console.log(`Recipient Balance: ${recipientBalance.toFixed(6)} BNB`)

    const needsGas = await secureGasProvider.needsGas(testAddress)
    console.log(`Needs Gas: ${needsGas}`)

    // Determine gas amount to send
    let gasAmount = amount || 0.005 // Default 0.005 BNB
    if (gasAmount > 0.02) {
      gasAmount = 0.02 // Cap at 0.02 BNB for safety
    }

    console.log(`Gas Amount to Send: ${gasAmount} BNB`)

    // Perform the gas send test
    console.log("🚀 Executing gas send...")
    const startTime = Date.now()

    const result = await secureGasProvider.sendGas(testAddress, gasAmount)

    const endTime = Date.now()
    const duration = endTime - startTime

    console.log(`⏱️ Transaction Duration: ${duration}ms`)

    if (result.success) {
      console.log("✅ === GAS SEND TEST SUCCESSFUL ===")
      console.log(`Transaction Hash: ${result.txHash}`)
      console.log(`Amount Sent: ${gasAmount} BNB`)
      console.log(`Recipient: ${testAddress}`)
      console.log(`Duration: ${duration}ms`)

      // Check recipient balance after sending (with delay)
      setTimeout(async () => {
        const newBalance = await secureGasProvider.getBalance(testAddress)
        console.log(`📊 Recipient New Balance: ${newBalance.toFixed(6)} BNB`)
        console.log(`📈 Balance Increase: ${(newBalance - recipientBalance).toFixed(6)} BNB`)
      }, 3000)

      return NextResponse.json({
        success: true,
        txHash: result.txHash,
        amount: gasAmount,
        recipient: testAddress,
        providerBalance: providerBalance,
        recipientBalanceBefore: recipientBalance,
        duration: duration,
        message: "Gas sent successfully",
        details: {
          needsGas: needsGas,
          gasProvided: true,
          timestamp: new Date().toISOString(),
        },
      })
    } else {
      console.error("❌ === GAS SEND TEST FAILED ===")
      console.error(`Error: ${result.error}`)

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          recipient: testAddress,
          providerBalance: providerBalance,
          recipientBalance: recipientBalance,
          duration: duration,
          details: {
            needsGas: needsGas,
            gasProvided: false,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 },
      )
    }
  } catch (error: any) {
    console.error("🚨 === GAS SEND TEST ERROR ===")
    console.error("Error:", error)
    console.error("Stack:", error.stack)

    return NextResponse.json(
      {
        success: false,
        error: "Gas send test failed",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

// GET endpoint for test status
export async function GET() {
  try {
    console.log("🔍 Gas Send Test Status Check")

    const isConfigured = secureGasProvider.isConfigured()
    const providerBalance = isConfigured ? await secureGasProvider.getProviderBalance() : 0

    return NextResponse.json({
      success: true,
      configured: isConfigured,
      providerBalance: providerBalance,
      status: providerBalance > 0.1 ? "ready" : providerBalance > 0.01 ? "low" : "critical",
      canTest: isConfigured && providerBalance > 0.01,
      message: isConfigured ? `Provider balance: ${providerBalance.toFixed(6)} BNB` : "Gas provider not configured",
      testEndpoint: "/api/test-gas-send",
      instructions: {
        method: "POST",
        body: {
          testAddress: "0x...",
          amount: 0.005,
        },
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check test status",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
