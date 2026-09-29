// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// hardened twin of ReentrantBank: zeroes the balance before the external call
// (checks-effects-interactions), so a reentrant withdraw finds nothing to take.
contract HardenedBank {
    mapping(address => uint256) public balanceOf;

    function deposit() external payable {
        balanceOf[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 bal = balanceOf[msg.sender];
        require(bal > 0, "no balance");
        balanceOf[msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: bal}("");
        require(ok, "send failed");
    }

    receive() external payable {}
}
