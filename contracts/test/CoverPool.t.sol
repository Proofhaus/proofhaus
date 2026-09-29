// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {Attestation} from "../src/Attestation.sol";
import {CoverPool} from "../src/CoverPool.sol";

contract CoverPoolTest is Test {
    MockERC20 usdc;
    Attestation att;
    CoverPool pool;
    address target = makeAddr("target");
    address holder = makeAddr("holder");

    function setUp() public {
        usdc = new MockERC20("USDC", "USDC");
        att = new Attestation(address(this));
        pool = new CoverPool(address(usdc), address(att));
    }

    // extraction $1000 (100000 cents), premium $200 (20000 cents)
    function _attest() internal {
        att.attest(target, 100000, 20000, 3, bytes32("c"));
    }

    function _lpDeposit(uint256 amount) internal {
        usdc.mint(address(this), amount);
        usdc.approve(address(pool), type(uint256).max);
        pool.deposit(amount);
    }

    function _buy() internal returns (uint256 id) {
        usdc.mint(holder, 1000e18);
        vm.startPrank(holder);
        usdc.approve(address(pool), type(uint256).max);
        id = pool.buyPolicy(target);
        vm.stopPrank();
    }

    function test_first_deposit_mints_one_to_one() public {
        _lpDeposit(100e18);
        assertEq(pool.totalShares(), 100e18);
        assertEq(pool.sharesOf(address(this)), 100e18);
        assertEq(pool.poolAssets(), 100e18);
    }

    function test_premium_accrues_to_lps() public {
        _attest();
        _lpDeposit(2000e18);
        _buy(); // pays 200e18 premium into the pool

        assertEq(pool.poolAssets(), 2200e18);
        uint256 got = pool.withdraw(pool.sharesOf(address(this)));
        assertEq(got, 2200e18); // lp captured the premium
    }

    function test_payout_reduces_lp_value() public {
        _attest();
        _lpDeposit(2000e18);
        uint256 id = _buy(); // pool 2200e18
        pool.triggerPayout(id); // pays 1000e18 coverage to holder

        assertEq(usdc.balanceOf(holder), 1800e18); // 1000 minted - 200 premium + 1000 payout
        assertEq(pool.poolAssets(), 1200e18);
        uint256 got = pool.withdraw(pool.sharesOf(address(this)));
        assertEq(got, 1200e18); // lp bore the net loss
    }

    function test_buy_reverts_without_attestation() public {
        _lpDeposit(2000e18);
        vm.expectRevert(CoverPool.NoAttestation.selector);
        pool.buyPolicy(target);
    }

    function test_buy_reverts_insufficient_capacity() public {
        _attest();
        _lpDeposit(500e18); // below the 1000e18 coverage
        vm.expectRevert(CoverPool.InsufficientCapacity.selector);
        pool.buyPolicy(target);
    }

    function test_only_guardian_can_payout() public {
        _attest();
        _lpDeposit(2000e18);
        uint256 id = _buy();
        vm.expectRevert(CoverPool.NotGuardian.selector);
        vm.prank(holder);
        pool.triggerPayout(id);
    }

    function test_double_payout_reverts() public {
        _attest();
        _lpDeposit(2000e18);
        uint256 id = _buy();
        pool.triggerPayout(id);
        vm.expectRevert(CoverPool.PolicyInactive.selector);
        pool.triggerPayout(id);
    }

    function test_expired_policy_cannot_pay() public {
        _attest();
        _lpDeposit(2000e18);
        uint256 id = _buy();
        vm.warp(block.timestamp + 366 days);
        vm.expectRevert(CoverPool.PolicyExpired.selector);
        pool.triggerPayout(id);
    }

    function test_set_guardian_only_owner() public {
        vm.expectRevert(CoverPool.NotOwner.selector);
        vm.prank(holder);
        pool.setGuardian(holder);
    }
}
