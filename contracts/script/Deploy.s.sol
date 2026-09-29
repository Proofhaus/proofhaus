// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {Attestation} from "../src/Attestation.sol";
import {CoverPool} from "../src/CoverPool.sol";

// deploys the proofhaus market: a settlement currency, the attestation registry,
// and the cover pool. run per chain:
//   forge script script/Deploy.s.sol:Deploy --rpc-url <name> --broadcast --private-key $PRIVATE_KEY
contract Deploy is Script {
    function run() external {
        address attestor = vm.envOr("ATTESTOR", msg.sender);

        vm.startBroadcast();
        MockERC20 currency = new MockERC20("Proofhaus USD", "phUSD");
        Attestation attestation = new Attestation(attestor);
        CoverPool coverPool = new CoverPool(address(currency), address(attestation));
        vm.stopBroadcast();

        console2.log("currency   ", address(currency));
        console2.log("attestation", address(attestation));
        console2.log("coverPool  ", address(coverPool));
        console2.log("attestor   ", attestor);
    }
}
