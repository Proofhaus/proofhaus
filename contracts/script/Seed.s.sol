// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {Attestation} from "../src/Attestation.sol";
import {CoverPool} from "../src/CoverPool.sol";

// runs the whole market loop once on a chain that already has the Deploy output, so the
// onchain panel shows real state: LP deposit, a scan attestation, and one bought policy.
// the numbers are the recorded vulnerable sample scan (app/src/app/lib/recorded.ts).
// the target is a label for that sample suite, which has no address of its own on chain.
//   COVER_POOL=<pool address> COMMIT=<git sha> forge script script/Seed.s.sol:Seed \
//     --rpc-url <url> --broadcast --private-key $PRIVATE_KEY
// the sender must be the attestor set at deploy time. phUSD has open mint, so it funds itself.
contract Seed is Script {
    uint256 constant LP_DEPOSIT = 500_000e18;
    uint256 constant EXTRACTION_CENTS = 35_972_744; // $359,727.44
    uint256 constant PREMIUM_CENTS = 13_597_697; // $135,976.97
    uint32 constant CLASSES = 4;

    function run() external {
        CoverPool pool = CoverPool(vm.envAddress("COVER_POOL"));
        Attestation attestation = Attestation(address(pool.attestation()));
        MockERC20 currency = MockERC20(address(pool.currency()));
        address target = address(uint160(uint256(keccak256("proofhaus:sample-suite-vulnerable"))));
        bytes32 commit = bytes32(bytes(vm.envOr("COMMIT", string("sample-suite"))));

        if (pool.policiesCount() > 0) {
            console2.log("already seeded, nothing to do");
            return;
        }
        require(attestation.attestor() == msg.sender, "sender is not the attestor");

        uint256 premiumWei = PREMIUM_CENTS * pool.CENTS_TO_WEI();

        vm.startBroadcast();
        currency.mint(msg.sender, LP_DEPOSIT + premiumWei);
        currency.approve(address(pool), LP_DEPOSIT + premiumWei);
        pool.deposit(LP_DEPOSIT);
        attestation.attest(target, EXTRACTION_CENTS, PREMIUM_CENTS, CLASSES, commit);
        pool.buyPolicy(target);
        vm.stopBroadcast();

        console2.log("pool      ", address(pool));
        console2.log("target    ", target);
        console2.log("poolAssets", pool.poolAssets());
        console2.log("policies  ", pool.policiesCount());
    }
}
