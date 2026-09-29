// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "../interfaces/IERC20.sol";

// a stand-in for a user's own vault: standard erc4626-style interface, prices
// shares off raw balance with no virtual offset. used to prove proofhaus can
// attack a contract it does not ship.
contract DemoVault {
    IERC20 public immutable asset;
    address public owner;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    constructor(address _asset) {
        asset = IERC20(_asset);
        owner = msg.sender;
    }

    function totalAssets() public view returns (uint256) {
        return asset.balanceOf(address(this));
    }

    function convertToShares(uint256 assets) public view returns (uint256) {
        return totalSupply == 0 ? assets : assets * totalSupply / totalAssets();
    }

    function convertToAssets(uint256 shares) public view returns (uint256) {
        return totalSupply == 0 ? shares : shares * totalAssets() / totalSupply;
    }

    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        shares = convertToShares(assets);
        asset.transferFrom(msg.sender, address(this), assets);
        totalSupply += shares;
        balanceOf[receiver] += shares;
    }

    function redeem(uint256 shares, address receiver, address owner_) external returns (uint256 assets) {
        require(msg.sender == owner_, "not owner");
        assets = convertToAssets(shares);
        balanceOf[owner_] -= shares;
        totalSupply -= shares;
        asset.transfer(receiver, assets);
    }
}
