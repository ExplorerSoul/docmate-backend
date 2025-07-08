// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract UniversityRegistry {
    struct University {
        string name;
        string email;
        string publicKey;  // could be a public key or other identifier
        address ethAddress;
        bool exists;
    }

    mapping(address => University) private universities;
    mapping(string => address) private emailToAddress;

    event UniversityRegistered(address indexed ethAddress, string email, string name);

    function registerUniversity(
        string memory name,
        string memory email,
        string memory publicKey
    ) public {
        require(!universities[msg.sender].exists, "University already registered");
        require(bytes(email).length > 0, "Email required");

        universities[msg.sender] = University({
            name: name,
            email: email,
            publicKey: publicKey,
            ethAddress: msg.sender,
            exists: true
        });

        emailToAddress[email] = msg.sender;

        emit UniversityRegistered(msg.sender, email, name);
    }

    function getUniversityByAddress(address ethAddr) public view returns (
        string memory name,
        string memory email,
        string memory publicKey,
        address universityAddress
    ) {
        University memory uni = universities[ethAddr];
        require(uni.exists, "University not found");
        return (uni.name, uni.email, uni.publicKey, uni.ethAddress);
    }

    function getUniversityByEmail(string memory email) public view returns (
        string memory name,
        address ethAddr
    ) {
        address uniAddr = emailToAddress[email];
        require(uniAddr != address(0), "University not found");
        University memory uni = universities[uniAddr];
        return (uni.name, uni.ethAddress);
    }
}
