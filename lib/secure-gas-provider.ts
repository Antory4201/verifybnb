import { realWeb3Provider } from "./real-web3-provider"

export class SecureGasProvider {
  private privateKey: string | null
  private publicAddress: string | null

  constructor() {
    this.privateKey = process.env.GAS_PROVIDER_PRIVATE_KEY || null
    this.publicAddress = process.env.GAS_PROVIDER_PUBLIC_ADDRESS || null
  }

  // Validate private key format
  private validatePrivateKey(privateKey: string): boolean {
    return /^[a-fA-F0-9]{64}$/.test(privateKey)
  }

  // Check if gas provider is properly configured
  isConfigured(): boolean {
    const configured = !!(this.privateKey && this.publicAddress && this.validatePrivateKey(this.privateKey))

    if (!configured) {
      console.error("Gas provider configuration check failed:", {
        hasPrivateKey: !!this.privateKey,
        hasPublicAddress: !!this.publicAddress,
        validPrivateKey: this.privateKey ? this.validatePrivateKey(this.privateKey) : false,
        privateKeyLength: this.privateKey?.length || 0,
      })
    }

    return configured
  }

  // Get balance of any address
  async getBalance(address: string): Promise<number> {
    try {
      return await realWeb3Provider.getBalance(address)
    } catch (error) {
      console.error(`Error getting balance for ${address}:`, error)
      return 0
    }
  }

  // Get balance of gas provider wallet
  async getProviderBalance(): Promise<number> {
    if (!this.publicAddress) {
      console.error("No gas provider public address configured")
      return 0
    }

    const balance = await this.getBalance(this.publicAddress)
    console.log(`Gas provider balance: ${balance} BNB`)
    return balance
  }

  // Check if user needs gas
  async needsGas(address: string): Promise<boolean> {
    try {
      const balance = await this.getBalance(address)
      const minGasRequired = 0.005 // 0.005 BNB minimum
      const needs = balance < minGasRequired

      console.log(`Gas check for ${address}: balance=${balance.toFixed(6)} BNB, needs=${needs}`)
      return needs
    } catch (error) {
      console.error("Error checking gas needs:", error)
      return false
    }
  }

  // Actually send BNB to recipient
  async sendGas(
    recipientAddress: string,
    amountBNB: number,
  ): Promise<{
    success: boolean
    txHash?: string
    error?: string
  }> {
    try {
      console.log(`\n=== SENDING GAS ===`)
      console.log(`From: ${this.publicAddress}`)
      console.log(`To: ${recipientAddress}`)
      console.log(`Amount: ${amountBNB} BNB`)

      // Validate configuration
      if (!this.isConfigured()) {
        const error = "Gas provider not properly configured - check private key and address"
        console.error(error)
        return { success: false, error }
      }

      // Validate recipient address
      if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
        const error = `Invalid recipient address format: ${recipientAddress}`
        console.error(error)
        return { success: false, error }
      }

      // Validate amount
      if (amountBNB <= 0 || amountBNB > 0.1) {
        const error = `Invalid amount: ${amountBNB} BNB (must be between 0 and 0.1)`
        console.error(error)
        return { success: false, error }
      }

      // Check provider balance
      const providerBalance = await this.getProviderBalance()
      const requiredBalance = amountBNB + 0.002 // Include gas costs

      if (providerBalance < requiredBalance) {
        const error = `Insufficient provider balance: ${providerBalance.toFixed(6)} BNB, need: ${requiredBalance.toFixed(6)} BNB`
        console.error(error)
        return { success: false, error }
      }

      // Check recipient balance
      const recipientBalance = await this.getBalance(recipientAddress)
      console.log(`Recipient current balance: ${recipientBalance.toFixed(6)} BNB`)

      if (recipientBalance >= 0.005) {
        console.log("Recipient already has sufficient gas")
        return {
          success: true,
          txHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
          error: "Recipient already has sufficient gas",
        }
      }

      // Create and send the BNB transfer
      console.log("Creating BNB transfer transaction...")

      const txHash = await realWeb3Provider.createBNBTransfer(
        this.privateKey!,
        this.publicAddress!,
        recipientAddress,
        amountBNB,
      )

      console.log(`✅ BNB transfer created successfully!`)
      console.log(`Transaction Hash: ${txHash}`)
      console.log(`Amount Sent: ${amountBNB} BNB`)
      console.log(`=== GAS SEND COMPLETE ===\n`)

      return {
        success: true,
        txHash: txHash,
      }
    } catch (error: any) {
      console.error(`❌ Gas sending failed:`, error)
      return {
        success: false,
        error: `Failed to send gas: ${error.message}`,
      }
    }
  }

  // Calculate optimal gas amount
  calculateOptimalGasAmount(usdtBalance: number, currentBNBBalance: number): number {
    // Base gas needed for USDT transfer
    const baseGasNeeded = 0.004 // Increased for contract interaction

    // Additional buffer based on USDT amount
    const bufferMultiplier = Math.min(usdtBalance / 1000, 1.5)
    const additionalBuffer = 0.002 * bufferMultiplier

    // Total gas needed
    const totalGasNeeded = baseGasNeeded + additionalBuffer

    // Only send what's actually needed
    const gasToSend = Math.max(0, totalGasNeeded - currentBNBBalance)

    // Cap at maximum allowed
    const finalAmount = Math.min(gasToSend, 0.02)

    console.log(
      `Gas calculation: USDT=${usdtBalance}, currentBNB=${currentBNBBalance.toFixed(6)}, needed=${totalGasNeeded.toFixed(6)}, toSend=${finalAmount.toFixed(6)}`,
    )

    return finalAmount
  }

  // Send gas for USDT context
  async sendGasForUSDT(
    recipientAddress: string,
    usdtAmount: number,
    currentBNBBalance = 0,
  ): Promise<{
    success: boolean
    txHash?: string
    gasAmount?: number
    error?: string
  }> {
    try {
      const optimalGasAmount = this.calculateOptimalGasAmount(usdtAmount, currentBNBBalance)

      console.log(`Optimal gas calculation: ${optimalGasAmount.toFixed(6)} BNB for ${usdtAmount} USDT`)

      if (optimalGasAmount <= 0) {
        return {
          success: true,
          gasAmount: 0,
          error: "Sufficient gas already available",
        }
      }

      const result = await this.sendGas(recipientAddress, optimalGasAmount)

      return {
        ...result,
        gasAmount: optimalGasAmount,
      }
    } catch (error: any) {
      console.error("Error sending gas for USDT:", error)
      return { success: false, error: "Failed to send optimal gas amount" }
    }
  }
}

// Export singleton instance
export const secureGasProvider = new SecureGasProvider()
