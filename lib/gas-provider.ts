// Gas provider utility functions
export class GasProvider {
  private rpcUrl: string
  private chainId: number
  private gasLimit: number
  private gasPrice: string

  constructor() {
    this.rpcUrl = process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/"
    this.chainId = 56
    this.gasLimit = 21000
    this.gasPrice = "5000000000" // 5 Gwei
  }

  // Check if address needs gas
  async needsGas(address: string): Promise<boolean> {
    try {
      const balance = await this.getBalance(address)
      const minGasRequired = 0.005 // 0.005 BNB minimum
      return balance < minGasRequired
    } catch (error) {
      console.error("Error checking gas needs:", error)
      return false
    }
  }

  // Get BNB balance of address
  async getBalance(address: string): Promise<number> {
    try {
      const response = await fetch(this.rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getBalance",
          params: [address, "latest"],
          id: 1,
        }),
      })

      const data = await response.json()
      const balanceWei = Number.parseInt(data.result, 16)
      return balanceWei / Math.pow(10, 18) // Convert wei to BNB
    } catch (error) {
      console.error("Error getting balance:", error)
      return 0
    }
  }

  // Calculate gas amount needed
  calculateGasAmount(currentBalance: number): number {
    const minRequired = 0.005
    const buffer = 0.002 // Extra buffer
    return Math.max(0, minRequired - currentBalance + buffer)
  }

  // Validate transaction parameters
  validateTransaction(toAddress: string, amount: number): boolean {
    // Check address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
      return false
    }

    // Check amount limits
    if (amount <= 0 || amount > 0.01) {
      return false
    }

    return true
  }

  // Get current gas price from network
  async getCurrentGasPrice(): Promise<string> {
    try {
      const response = await fetch(this.rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_gasPrice",
          params: [],
          id: 1,
        }),
      })

      const data = await response.json()
      return data.result
    } catch (error) {
      console.error("Error getting gas price:", error)
      return this.gasPrice // Return default
    }
  }

  // Estimate transaction cost
  async estimateTransactionCost(): Promise<number> {
    try {
      const gasPrice = await this.getCurrentGasPrice()
      const gasPriceWei = Number.parseInt(gasPrice, 16)
      const totalCost = gasPriceWei * this.gasLimit
      return totalCost / Math.pow(10, 18) // Convert to BNB
    } catch (error) {
      console.error("Error estimating transaction cost:", error)
      return 0.0001 // Default estimate
    }
  }
}

// Export singleton instance
export const gasProvider = new GasProvider()
