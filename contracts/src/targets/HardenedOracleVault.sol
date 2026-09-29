// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "../interfaces/IERC20.sol";

interface ISpotOracle {
    function getReserves() external view returns (uint256, uint256);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

// hardened twin of NaiveOracleVault: prices collateral off a fixed reference
// captured at deploy, so intra-transaction spot manipulation does not move it.
// stands in for a time-weighted or external oracle.
contract HardenedOracleVault {
    IERC20 public immutable debt;
    IERC20 public immutable collateral;
    uint256 public immutable trustedPrice;
    uint256 public constant LTV_BPS = 7000;

    mapping(address => uint256) public collateralOf;
    mapping(address => uint256) public debtOf;

    constructor(address _debt, address _collateral, address _oracle) {
        debt = IERC20(_debt);
        collateral = IERC20(_collateral);
        (uint256 r0, uint256 r1) = ISpotOracle(_oracle).getReserves();
        (uint256 rColl, uint256 rDebt) =
            ISpotOracle(_oracle).token0() == _collateral ? (r0, r1) : (r1, r0);
        trustedPrice = rDebt * 1e18 / rColl;
    }

    function supply(uint256 amount) external {
        debt.transferFrom(msg.sender, address(this), amount);
    }

    function price() public view returns (uint256) {
        return trustedPrice;
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
