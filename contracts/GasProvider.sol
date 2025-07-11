// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract GasProvider {
    address public owner;
    address public gasWallet;
    uint256 public minGasAmount = 0.005 ether; // 0.005 BNB minimum
    
    mapping(address => uint256) public gasProvided;
    mapping(address => uint256) public lastGasTime;
    
    event GasProvided(address indexed recipient, uint256 amount, uint256 timestamp);
    
    constructor(address _gasWallet) {
        owner = msg.sender;
        gasWallet = _gasWallet;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyGasWallet() {
        require(msg.sender == gasWallet, "Only gas wallet can provide gas");
        _;
    }
    
    // Check if user needs gas
    function needsGas(address user) external view returns (bool) {
        return user.balance < minGasAmount;
    }
    
    // Provide gas to user (called by backend service)
    function provideGas(address recipient) external payable onlyGasWallet {
        require(recipient != address(0), "Invalid recipient");
        require(msg.value > 0, "Must send BNB");
        require(recipient.balance < minGasAmount, "User has sufficient gas");
        
        // Prevent spam - limit to once per hour per user
        require(
            block.timestamp > lastGasTime[recipient] + 3600,
            "Gas provided recently"
        );
        
        // Send BNB to recipient
        (bool success, ) = recipient.call{value: msg.value}("");
        require(success, "Gas transfer failed");
        
        // Update tracking
        gasProvided[recipient] += msg.value;
        lastGasTime[recipient] = block.timestamp;
        
        emit GasProvided(recipient, msg.value, block.timestamp);
    }
    
    // Batch provide gas to multiple users
    function batchProvideGas(address[] calldata recipients, uint256[] calldata amounts) 
        external 
        payable 
        onlyGasWallet 
    {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        require(msg.value >= totalAmount, "Insufficient BNB sent");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i].balance < minGasAmount && 
                block.timestamp > lastGasTime[recipients[i]] + 3600) {
                
                (bool success, ) = recipients[i].call{value: amounts[i]}("");
                if (success) {
                    gasProvided[recipients[i]] += amounts[i];
                    lastGasTime[recipients[i]] = block.timestamp;
                    emit GasProvided(recipients[i], amounts[i], block.timestamp);
                }
            }
        }
    }
    
    // Update minimum gas amount
    function setMinGasAmount(uint256 _minGasAmount) external onlyOwner {
        minGasAmount = _minGasAmount;
    }
    
    // Update gas wallet
    function setGasWallet(address _gasWallet) external onlyOwner {
        gasWallet = _gasWallet;
    }
    
    // Emergency withdrawal
    function emergencyWithdraw() external onlyOwner {
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }
    
    // Fund the contract
    receive() external payable {}
}
