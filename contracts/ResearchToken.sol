
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ResearchToken {
    string public name = "Research Token";
    string public symbol = "RTK";

    mapping(address => uint256) public balanceOf;

    event Transfer(
        address indexed from,
        address indexed to,
        uint256 amount
    );

    constructor() {
        balanceOf[msg.sender] = 1000;
    }

    function transfer(
        address to,
        uint256 amount
    ) external returns (bool) {
        require(to != address(0), "Invalid recipient");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");

        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;

        emit Transfer(msg.sender, to, amount);

        return true;
    }
}

