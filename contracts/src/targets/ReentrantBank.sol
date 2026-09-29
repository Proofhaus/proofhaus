// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// sample target: an eth bank whose withdraw zeroes the balance after the
// external call. hardened variant applies checks-effects-interactions or a guard.
contract ReentrantBank {
    mapping(address => uint256) public balanceOf;

    function deposit() external payable {
        balanceOf[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 bal = balanceOf[msg.sender];
        require(bal > 0, "no balance");
        (bool ok,) = msg.sender.call{value: bal}("");
        require(ok, "send failed");
        balanceOf[msg.sender] = 0;
    }

    receive() external payable {}
}
