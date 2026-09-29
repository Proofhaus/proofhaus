// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "../interfaces/IERC20.sol";

// a stand-in for a user's own constant-product pool: standard swap/reserves
// interface, no slippage bound. used to prove proofhaus can attack a pool it
// does not ship.
contract DemoAMM {
    address public immutable token0;
    address public immutable token1;
    uint256 public constant FEE_BPS = 30;

    uint256 public reserve0;
    uint256 public reserve1;

    constructor(address _token0, address _token1) {
        token0 = _token0;
        token1 = _token1;
    }

    function addLiquidity(uint256 amount0, uint256 amount1) external {
        IERC20(token0).transferFrom(msg.sender, address(this), amount0);
        IERC20(token1).transferFrom(msg.sender, address(this), amount1);
        reserve0 += amount0;
        reserve1 += amount1;
    }

    function getReserves() external view returns (uint256, uint256) {
        return (reserve0, reserve1);
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public
        pure
        returns (uint256)
    {
        uint256 inWithFee = amountIn * (10_000 - FEE_BPS);
        return inWithFee * reserveOut / (reserveIn * 10_000 + inWithFee);
    }

    function swap(address tokenIn, uint256 amountIn, address to) external returns (uint256 amountOut) {
        require(tokenIn == token0 || tokenIn == token1, "bad token");
        bool zeroForOne = tokenIn == token0;
        (uint256 reserveIn, uint256 reserveOut) = zeroForOne ? (reserve0, reserve1) : (reserve1, reserve0);
        address tokenOut = zeroForOne ? token1 : token0;

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        require(amountOut > 0, "insufficient output");

        if (zeroForOne) {
            reserve0 = reserveIn + amountIn;
            reserve1 = reserveOut - amountOut;
        } else {
            reserve1 = reserveIn + amountIn;
            reserve0 = reserveOut - amountOut;
        }
        IERC20(tokenOut).transfer(to, amountOut);
    }
}
