// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BlockStorage {
    struct Record {
        address owner;
        uint256 time;
        bytes32[4] hashes;
        string[4] cids;
    }

    mapping(bytes32 => Record) private records;

    event FileAdded(bytes32 indexed id, address indexed owner);

    function addFile(bytes32 id, bytes32[4] calldata hashes, string[4] memory cids) external {
        require(records[id].owner == address(0), "Already exists");
        Record storage r = records[id];
        r.owner = msg.sender;
        r.time = block.timestamp;
        for (uint256 i = 0; i < 4; i++) {
            r.hashes[i] = hashes[i];
            r.cids[i] = cids[i];
        }
        emit FileAdded(id, msg.sender);
    }

    function getFile(bytes32 id)
        external view
        returns (address owner, uint256 time, bytes32[4] memory hashes, string[4] memory cids)
    {
        Record storage r = records[id];
        require(r.owner != address(0), "Not found");
        return (r.owner, r.time, r.hashes, r.cids);
    }
}
