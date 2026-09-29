// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "../interfaces/IERC20.sol";

interface ISpotOracle {
    function getReserves() external view returns (uint256, uint256);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

/// @notice a lending vault that prices collateral from an AMM's instantaneous
/// spot reserves. intentionally vulnerable: the price is manipulable within a
/// single transaction, so an attacker can pump it, over-borrow, and drain the
/// lending reserve. the hardened variant uses a time-weighted or external oracle.
contract NaiveOracleVault {
    IERC20 public immutable debt; // asset the vault lends, e.g. USDC
    IERC20 public immutable collateral; // asset users pledge
    ISpotOracle public immutable oracle; // AMM used as the price source
    uint256 public constant LTV_BPS = 7000; // 70%

    mapping(address => uint256) public collateralOf;
    mapping(address => uint256) public debtOf;

    constructor(address _debt, address _collateral, address _oracle) {
        debt = IERC20(_debt);
        collateral = IERC20(_collateral);
        oracle = ISpotOracle(_oracle);
    }

    // fund the lending reserve
    function supply(uint256 amount) external {
        debt.transferFrom(msg.sender, address(this), amount);
    }

    // price of 1e18 collateral in debt units, straight from spot reserves
    function price() public view returns (uint256) {
        (uint256 r0, uint256 r1) = oracle.getReserves();
        (uint256 rColl, uint256 rDebt) =
            oracle.token0() == address(collateral) ? (r0, r1) : (r1, r0);
        return rDebt * 1e18 / rColl;
    }

    function deposit(uint256 amount) external {
        collateral.transferFrom(msg.sender, address(this), amount);
        collateralOf[msg.sender] += amount;
    }

    function borrow(uint256 amount) external {
        uint256 collValue = collateralOf[msg.sender] * price() / 1e18;
        uint256 maxDebt = collValue * LTV_BPS / 10_000;
        require(debtOf[msg.sender] + amount <= maxDebt, "undercollateralized");
        debtOf[msg.sender] += amount;
        debt.transfer(msg.sender, amount);
    }
}
