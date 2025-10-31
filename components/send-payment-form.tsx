"use client"

import type React from "react"
import { useState } from "react"

const SendPaymentForm = () => {
  const [amount, setAmount] = useState("")

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(event.target.value)
  }

  return (
    <input
      type="number"
      value={amount}
      onChange={handleAmountChange}
      placeholder="USDT Amount"
      className="flex-1 bg-transparent outline-none text-gray-900 placeholder:text-gray-400 text-sm sm:text-base min-w-0 leading-7"
      style={{
        color: amount ? "#000000" : "inherit",
      }}
    />
  )
}

export default SendPaymentForm
