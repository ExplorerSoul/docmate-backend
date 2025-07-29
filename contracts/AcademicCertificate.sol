// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AcademicCertificate {
    struct Certificate {
        string studentId;
        string fileHash;
        address issuer;
        uint256 issuedAt;
    }

    uint256 public certificateCount;
    mapping(uint256 => Certificate) public certificates;

    event CertificateIssued(
        uint256 indexed certId,
        string indexed studentId,
        string fileHash,
        address indexed issuer,
        uint256 issuedAt
    );

    // For bulk uploads (Merkle Root)
    struct Batch {
        bytes32 merkleRoot;
        address issuer;
        uint256 issuedAt;
    }

    uint256 public batchCount;
    mapping(uint256 => Batch) public batches;

    event BatchIssued(
        uint256 indexed batchId,
        bytes32 indexed merkleRoot,
        address indexed issuer,
        uint256 issuedAt
    );

    // =====================
    // ✅ Single Upload
    // =====================
    function issueCertificate(string calldata studentId, string calldata fileHash)
        external
        returns (uint256 certId)
    {
        require(bytes(studentId).length > 0, "Student ID is required");
        require(bytes(fileHash).length > 0, "File hash is required");

        certId = certificateCount;
        certificates[certId] = Certificate(studentId, fileHash, msg.sender, block.timestamp);

        emit CertificateIssued(certId, studentId, fileHash, msg.sender, block.timestamp);

        certificateCount++;
    }

    function getCertificate(uint256 certId)
        external
        view
        returns (string memory studentId, string memory fileHash, address issuer, uint256 issuedAt)
    {
        require(certId < certificateCount, "Certificate does not exist");
        Certificate memory cert = certificates[certId];
        return (cert.studentId, cert.fileHash, cert.issuer, cert.issuedAt);
    }

    // =====================
    // ✅ Bulk Upload (Merkle)
    // =====================
    function issueBatchMerkle(bytes32 merkleRoot)
        external
        returns (uint256 batchId)
    {
        require(merkleRoot != bytes32(0), "Invalid Merkle Root");

        batchId = batchCount;
        batches[batchId] = Batch(merkleRoot, msg.sender, block.timestamp);

        emit BatchIssued(batchId, merkleRoot, msg.sender, block.timestamp);

        batchCount++;
    }

    function getBatch(uint256 batchId)
        external
        view
        returns (bytes32 merkleRoot, address issuer, uint256 issuedAt)
    {
        require(batchId < batchCount, "Batch does not exist");
        Batch memory b = batches[batchId];
        return (b.merkleRoot, b.issuer, b.issuedAt);
    }

    // =====================
    // ✅ Bulk Verification via Merkle Proof
    // =====================
    function verifyInBatch(bytes32 leaf, uint256 batchId, bytes32[] calldata proof)
        external
        view
        returns (bool)
    {
        require(batchId < batchCount, "Batch does not exist");

        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            if (computedHash <= proofElement) {
                // Hash(current computed hash + current element of the proof)
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                // Hash(proof element + current computed hash)
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        return computedHash == batches[batchId].merkleRoot;
    }
}
