import { NextResponse } from "next/server"
import { secureGasProvider } from "@/lib/secure-gas-provider"

export async function GET() {
  try {
    console.log("=== Gas Provider Status Check ===")

    const isConfigured = secureGasProvider.isConfigured()
    console.log(`Configured: ${isConfigured}`)

    if (!isConfigured) {
      console.log("Gas provider not configured")
      return NextResponse.json({
        success: false,
        configured: false,
        error: "Gas provider not configured",
        details: "Missing GAS_PROVIDER_PRIVATE_KEY or GAS_PROVIDER_PUBLIC_ADDRESS environment variables",
      })
    }

    const balance = await secureGasProvider.getProviderBalance()
    console.log(`Provider balance: ${balance} BNB`)

    const status = balance > 0.1 ? "healthy" : balance > 0.01 ? "low" : "critical"
    console.log(`Status: ${status}`)

    return NextResponse.json({
      success: true,
      configured: true,
      balance: balance,
      status: status,
      message: `Provider balance: ${balance.toFixed(4)} BNB`,
      canSendGas: balance > 0.01,
      recommendations: {
        healthy: balance > 0.1,
        needsRefill: balance < 0.05,
        critical: balance < 0.01,
      },
    })
  } catch (error: any) {
    console.error("=== Gas Provider Status Error ===")
    console.error("Error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to check provider status",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
