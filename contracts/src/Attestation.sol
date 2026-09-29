// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice on-chain record of the latest proofhaus scan per target. the engine
/// is the authorized attestor; the cover market reads the extraction and premium
/// from here. monetary values are USD cents.
contract Attestation {
    struct Report {
        uint256 extractionCents;
        uint256 premiumCents;
        uint32 classes; // successful attack classes
        uint64 timestamp;
        bytes32 commit; // git commit the scan ran against
        bool exists;
    }

    address public owner;
    address public attestor;

    mapping(address => Report) private _latest;

    event Attested(
        address indexed target, uint256 extractionCents, uint256 premiumCents, uint32 classes, bytes32 commit
    );
    event AttestorChanged(address indexed previous, address indexed next);

    error NotOwner();
    error NotAttestor();

    constructor(address _attestor) {
        owner = msg.sender;
        attestor = _attestor;
    }

    modifier onlyAttestor() {
        if (msg.sender != attestor) revert NotAttestor();
        _;
    }

    function setAttestor(address next) external {
        if (msg.sender != owner) revert NotOwner();
        emit AttestorChanged(attestor, next);
        attestor = next;
    }

    function attest(
        address target,
        uint256 extractionCents,
        uint256 premiumCents,
        uint32 classes,
        bytes32 commit
    ) external onlyAttestor {
        _latest[target] = Report({
            extractionCents: extractionCents,
            premiumCents: premiumCents,
            classes: classes,
            timestamp: uint64(block.timestamp),
            commit: commit,
            exists: true
        });
        emit Attested(target, extractionCents, premiumCents, classes, commit);
    }

    function latest(address target) external view returns (Report memory) {
        return _latest[target];
    }

    function premiumCentsOf(address target) external view returns (uint256) {
        return _latest[target].premiumCents;
    }
}
