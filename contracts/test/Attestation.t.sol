// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Attestation} from "../src/Attestation.sol";

contract AttestationTest is Test {
    Attestation att;
    address engine = makeAddr("engine");
    address target = makeAddr("target");

    event Attested(
        address indexed target, uint256 extractionCents, uint256 premiumCents, uint32 classes, bytes32 commit
    );

    function setUp() public {
        att = new Attestation(engine);
    }

    function test_attest_records_latest() public {
        vm.prank(engine);
        att.attest(target, 35972744, 13597697, 4, bytes32("abc"));

        Attestation.Report memory r = att.latest(target);
        assertEq(r.extractionCents, 35972744);
        assertEq(r.premiumCents, 13597697);
        assertEq(r.classes, 4);
        assertEq(r.commit, bytes32("abc"));
        assertTrue(r.exists);
        assertEq(r.timestamp, uint64(block.timestamp));
        assertEq(att.premiumCentsOf(target), 13597697);
    }

    function test_rescan_overwrites() public {
        vm.startPrank(engine);
        att.attest(target, 100, 50, 2, bytes32("v1"));
        att.attest(target, 0, 0, 0, bytes32("v2")); // hardened rescan
        vm.stopPrank();

        Attestation.Report memory r = att.latest(target);
        assertEq(r.extractionCents, 0);
        assertEq(r.classes, 0);
        assertEq(r.commit, bytes32("v2"));
        assertTrue(r.exists);
    }

    function test_emits_event() public {
        vm.expectEmit(true, false, false, true);
        emit Attested(target, 100, 50, 2, bytes32("c"));
        vm.prank(engine);
        att.attest(target, 100, 50, 2, bytes32("c"));
    }

    function test_only_attestor_can_attest() public {
        vm.expectRevert(Attestation.NotAttestor.selector);
        att.attest(target, 1, 1, 1, bytes32(0));
    }

    function test_owner_can_rotate_attestor() public {
        address next = makeAddr("engine2");
        att.setAttestor(next);
        assertEq(att.attestor(), next);

        vm.prank(next);
        att.attest(target, 5, 5, 1, bytes32("x"));
        assertEq(att.premiumCentsOf(target), 5);

        // old attestor loses access
        vm.expectRevert(Attestation.NotAttestor.selector);
        vm.prank(engine);
        att.attest(target, 9, 9, 1, bytes32("y"));
    }

    function test_non_owner_cannot_rotate() public {
        vm.expectRevert(Attestation.NotOwner.selector);
        vm.prank(engine);
        att.setAttestor(engine);
    }

    function test_unknown_target_is_empty() public {
        Attestation.Report memory r = att.latest(makeAddr("nobody"));
        assertFalse(r.exists);
        assertEq(r.extractionCents, 0);
    }
}
