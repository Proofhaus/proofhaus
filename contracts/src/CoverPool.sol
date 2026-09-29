// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "./interfaces/IERC20.sol";

interface IAttestation {
    struct Report {
        uint256 extractionCents;
        uint256 premiumCents;
        uint32 classes;
        uint64 timestamp;
        bytes32 commit;
        bool exists;
    }

    function latest(address target) external view returns (Report memory);
}

/// @notice a shared cover pool. LPs deposit the currency and share the pool's
/// gains (premiums) and losses (payouts). a protocol buys a policy sized and
/// priced off its latest proofhaus attestation. payout is guardian-triggered in
/// this version; decentralized triggering is the roadmap.
contract CoverPool {
    IERC20 public immutable currency;
    IAttestation public immutable attestation;

    address public owner;
    address public guardian;

    uint256 public constant CENTS_TO_WEI = 1e16; // $0.01 in an 18-decimal token
    uint256 public constant DURATION = 365 days;

    uint256 public totalShares;
    mapping(address => uint256) public sharesOf;

    struct Policy {
        address target;
        address holder;
        uint256 coverageWei;
        uint256 premiumWei;
        uint64 expiry;
        bool active;
        bool claimed;
    }

    Policy[] public policies;

    event Deposited(address indexed lp, uint256 amount, uint256 shares);
    event Withdrawn(address indexed lp, uint256 shares, uint256 amount);
    event PolicyBought(uint256 indexed id, address indexed target, address indexed holder, uint256 coverageWei, uint256 premiumWei);
    event PaidOut(uint256 indexed id, address indexed holder, uint256 amount);
    event GuardianChanged(address indexed previous, address indexed next);

    error NotOwner();
    error NotGuardian();
    error NoAttestation();
    error InsufficientCapacity();
    error PolicyInactive();
    error PolicyExpired();

    constructor(address _currency, address _attestation) {
        owner = msg.sender;
        guardian = msg.sender;
        currency = IERC20(_currency);
        attestation = IAttestation(_attestation);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyGuardian() {
        if (msg.sender != guardian) revert NotGuardian();
        _;
    }

    function setGuardian(address next) external onlyOwner {
        emit GuardianChanged(guardian, next);
        guardian = next;
    }

    function poolAssets() public view returns (uint256) {
        return currency.balanceOf(address(this));
    }

    function deposit(uint256 amount) external returns (uint256 shares) {
        uint256 assets = poolAssets();
        shares = totalShares == 0 ? amount : amount * totalShares / assets;
        currency.transferFrom(msg.sender, address(this), amount);
        totalShares += shares;
        sharesOf[msg.sender] += shares;
        emit Deposited(msg.sender, amount, shares);
    }

    function withdraw(uint256 shares) external returns (uint256 amount) {
        amount = shares * poolAssets() / totalShares;
        sharesOf[msg.sender] -= shares;
        totalShares -= shares;
        currency.transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, shares, amount);
    }

    function buyPolicy(address target) external returns (uint256 id) {
        IAttestation.Report memory r = attestation.latest(target);
        if (!r.exists || r.premiumCents == 0) revert NoAttestation();

        uint256 coverageWei = r.extractionCents * CENTS_TO_WEI;
        uint256 premiumWei = r.premiumCents * CENTS_TO_WEI;
        if (poolAssets() < coverageWei) revert InsufficientCapacity();

        currency.transferFrom(msg.sender, address(this), premiumWei);

        id = policies.length;
        policies.push(
            Policy({
                target: target,
                holder: msg.sender,
                coverageWei: coverageWei,
                premiumWei: premiumWei,
                expiry: uint64(block.timestamp) + uint64(DURATION),
                active: true,
                claimed: false
            })
        );
        emit PolicyBought(id, target, msg.sender, coverageWei, premiumWei);
    }

    function triggerPayout(uint256 id) external onlyGuardian {
        Policy storage p = policies[id];
        if (!p.active || p.claimed) revert PolicyInactive();
        if (block.timestamp > p.expiry) revert PolicyExpired();
        if (poolAssets() < p.coverageWei) revert InsufficientCapacity();

        p.active = false;
        p.claimed = true;
        currency.transfer(p.holder, p.coverageWei);
        emit PaidOut(id, p.holder, p.coverageWei);
    }

    function policiesCount() external view returns (uint256) {
        return policies.length;
    }
}
