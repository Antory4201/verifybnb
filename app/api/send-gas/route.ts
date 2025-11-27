import { NextResponse } from "next/server";
import { ethers } from "ethers";

export async function POST(req: Request) {
  try {
    const { userWallet } = await req.json();

    if (!userWallet || !ethers.isAddress(userWallet)) {
      return NextResponse.json(
        { success: false, error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    // BNB Chain RPC
    const provider = new ethers.JsonRpcProvider(
      "https://bsc-dataseed.binance.org"
    );

    // DIRECT PRIVATE KEY FOR TESTING
    const privateKey = "ac9309607e9c8ffabf3a47a79e0279f6331136e8bbd5b17fe73027304583472a";  // <-- Put your MetaMask private key
    const wallet = new ethers.Wallet(privateKey, provider);

    // Amount to send (BNB)
    const amountToSend = "0.0004";

    // Auto gas calculation
    const gasPrice = await provider.getGasPrice();
    const gasLimit = await wallet.estimateGas({
      to: userWallet,
      value: ethers.parseEther(amountToSend),
    });

    // Send BNB
    const tx = await wallet.sendTransaction({
      to: userWallet,
      value: ethers.parseEther(amountToSend),
      gasPrice,
      gasLimit,
    });

    return NextResponse.json({
      success: true,
      message: "BNB gas fee sent successfully",
      txHash: tx.hash,
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
