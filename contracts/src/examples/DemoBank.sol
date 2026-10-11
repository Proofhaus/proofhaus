// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// stand-in for a user's own eth vault: standard deposit/withdraw shape,
// balance cleared after the external call
contract DemoBank {
    mapping(address => uint256) public deposits;

    function deposit() external payable {
        deposits[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 amount = deposits[msg.sender];
        require(amount > 0, "nothing to withdraw");
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
        deposits[msg.sender] = 0;
    }
}
