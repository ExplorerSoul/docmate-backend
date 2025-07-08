// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract StudentRegistry {
    struct Student {
        string name;
        string email;     // Optional, can be encrypted off-chain or hashed
        bool exists;
    }

    // Mapping student Ethereum address => Student info
    mapping(address => Student) private students;

    // Events
    event StudentRegistered(address indexed studentAddress, string name);

    // Register a new student or update existing info
    function registerStudent(string memory name, string memory email) public {
        require(bytes(name).length > 0, "Name is required");

        students[msg.sender] = Student({
            name: name,
            email: email,
            exists: true
        });

        emit StudentRegistered(msg.sender, name);
    }

    // Get student info by address
    function getStudent(address studentAddress) public view returns (string memory, string memory, bool) {
        Student memory student = students[studentAddress];
        require(student.exists, "Student not registered");
        return (student.name, student.email, student.exists);
    }

    // Check if student is registered
    function isStudentRegistered(address studentAddress) public view returns (bool) {
        return students[studentAddress].exists;
    }
}
