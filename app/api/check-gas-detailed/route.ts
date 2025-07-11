import { type NextRequest, NextResponse } from "next/server"
import { secureGasProvider } from "@/lib/secure-gas-provider"

// Detailed gas checking with user feedback
export async function POST(request: NextRequest) {
  try {
    const { address, usdtAmount } = await request.json()

    if (!address) {
      return NextResponse.json({ success: false, error: "Address required" }, { status: 400 })
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ success: false, error: "Invalid address format" }, { status: 400 })
    }

    console.log(`Detailed gas check for ${address} with ${usdtAmount} USDT`)

    // Get current BNB balance
    const currentBNBBalance = await secureGasProvider.getBalance(address)
    console.log(`Current BNB balance: ${currentBNBBalance}`)

    // Calculate gas requirements
    const minGasRequired = 0.005 // 0.005 BNB minimum for transactions
    const usdtTransferGas = 0.003 // Gas needed for USDT transfer
    const bufferGas = 0.002 // Safety buffer

    // Calculate optimal gas based on USDT amount
    let optimalGas = usdtTransferGas
    if (usdtAmount) {
      // More USDT = slightly more gas for safety
      const additionalGas = Math.min((usdtAmount / 1000) * 0.001, 0.003)
      optimalGas = usdtTransferGas + additionalGas + bufferGas
    }

    // Determine gas status
    const needsGas = currentBNBBalance < minGasRequired
    const gasShortfall = Math.max(0, optimalGas - currentBNBBalance)
    const gasToSend = needsGas ? gasShortfall : 0

    // Check gas provider status
    const providerBalance = await secureGasProvider.getProviderBalance()
    const providerCanSend = providerBalance >= gasToSend + 0.001 // Include buffer

    // Estimate transaction costs
    const estimatedTxCost = await secureGasProvider.estimateTransactionCost()

    return NextResponse.json({
      success: true,
      userAddress: address,
      currentBNBBalance: currentBNBBalance,
      minGasRequired: minGasRequired,
      optimalGas: optimalGas,
      needsGas: needsGas,
      gasShortfall: gasShortfall,
      gasToSend: gasToSend,
      providerBalance: providerBalance,
      providerCanSend: providerCanSend,
      estimatedTxCost: estimatedTxCost,
      usdtAmount: usdtAmount || 0,
      recommendations: {
        canProceed: !needsGas || (needsGas && providerCanSend),
        message: needsGas
          ? providerCanSend
            ? `Will provide ${gasToSend.toFixed(4)} BNB for gas fees`
            : "Gas provider has insufficient balance"
          : "User has sufficient gas for transaction",
        action: needsGas && providerCanSend ? "provide_gas" : needsGas ? "insufficient_provider" : "no_action_needed",
      },
    })
  } catch (error) {
    console.error("Detailed gas check error:", error)
    return NextResponse.json({ success: false, error: "Failed to check gas requirements" }, { status: 500 })
  }
}
