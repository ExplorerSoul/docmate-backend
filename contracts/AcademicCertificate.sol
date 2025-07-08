// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AcademicCertificate {
    struct Certificate {
        string studentId;    // e.g. "2214134@iitk"
        string fileHash;     // SHA-256 or IPFS hash
        address issuer;      // Address of the institute/admin
        uint256 issuedAt;    // Timestamp of issue
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

    function issueCertificate(string calldata studentId, string calldata fileHash)
        external
        returns (uint256 certId)
    {
        require(bytes(studentId).length > 0, "Student ID is required");
        require(bytes(fileHash).length > 0, "File hash is required");

        certId = certificateCount;

        certificates[certId] = Certificate({
            studentId: studentId,
            fileHash: fileHash,
            issuer: msg.sender,
            issuedAt: block.timestamp
        });

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
}
