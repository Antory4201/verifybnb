import { type NextRequest, NextResponse } from "next/server"
import { secureGasProvider } from "@/lib/secure-gas-provider"

// Check if user needs gas fees
export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json()

    if (!address) {
      return NextResponse.json({ success: false, error: "Address required" }, { status: 400 })
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ success: false, error: "Invalid address format" }, { status: 400 })
    }

    console.log(`Checking gas requirements for ${address}`)

    // Check if user needs gas
    const needsGas = await secureGasProvider.needsGas(address)
    const currentBalance = await secureGasProvider.getBalance(address)

    console.log(`Address ${address}: balance=${currentBalance} BNB, needsGas=${needsGas}`)

    // Calculate gas amount needed
    const minRequired = 0.005
    const gasAmount = Math.max(0, minRequired - currentBalance + 0.001) // Add small buffer

    return NextResponse.json({
      success: true,
      needsGas,
      currentBalance,
      gasAmount,
      minRequired,
    })
  } catch (error) {
    console.error("Gas check error:", error)
    return NextResponse.json({ success: false, error: "Failed to check gas requirements" }, { status: 500 })
  }
}
