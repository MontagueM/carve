// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract carve {
    struct UserProfile {
        uint256 username;
        uint256 bio;
        string pfpURL;
    }

    struct Carving {
        uint256 message;
        address carver;
        uint256 timestamp;
    }

    struct Etch {
        uint256 message;
        address etcher;
        uint256 timestamp;
    }

    uint256 public constant MAX_PFP_URL_LENGTH = 128;

    mapping(address => UserProfile) public userProfiles;

    // Global list of carvings
    Carving[] public carvings;

    // Mapping from user address to their carving IDs
    mapping(address => uint256[]) public userCarvings;

    // Likes system
    mapping(uint256 => uint256) public carvingLikes; // carvingId => like count
    mapping(uint256 => mapping(address => bool)) public carvingLikedBy; // carvingId => user => liked

    // Reposts system
    mapping(uint256 => uint256) public recarvings; // carvingId => repost count

    // Comments system
    mapping(uint256 => Etch[]) public carvingEtches; // carvingId => comments

    event UserCreated(address indexed user);
    event UsernameUpdated(address indexed user, uint256 newUsername);
    event BioUpdated(address indexed user, uint256 newBio);
    event PfpURLUpdated(address indexed user, string newPfpURL);
    event CarvingCreated(address indexed user, uint256 carvingId, uint256 message);
    event CarvingLiked(address indexed user, uint256 carvingId);
    event CarvingUnliked(address indexed user, uint256 carvingId);
    event CarvingReposted(address indexed user, uint256 carvingId);
    event EtchAdded(address indexed user, uint256 carvingId, uint256 etchId, uint256 message);

    // Internal function to check if the user is new
    function _isNewUser(address _user) internal view returns (bool) {
        return bytes(userProfiles[_user].pfpURL).length == 0 &&
        userProfiles[_user].username == 0 &&
            userProfiles[_user].bio == 0;
    }

    function _isUser(address _user) internal view returns (bool) {
        return userProfiles[_user].username != 0;
    }

    function setUsername(uint256 _username) public {
        if (_isNewUser(msg.sender)) {
            emit UserCreated(msg.sender);
        } else {
            emit UsernameUpdated(msg.sender, _username);
        }
        userProfiles[msg.sender].username = _username;
    }

    function setBio(uint256 _bio) public {
        require(_isUser(msg.sender), "Profile does not exist");
        emit BioUpdated(msg.sender, _bio);
        userProfiles[msg.sender].bio = _bio;
    }

    function setPfpURL(string memory _pfpURL) public {
        require(_isUser(msg.sender), "Profile does not exist");
        require(bytes(_pfpURL).length <= MAX_PFP_URL_LENGTH, "PfpURL exceeds maximum length of 128 characters");

        emit PfpURLUpdated(msg.sender, _pfpURL);
        userProfiles[msg.sender].pfpURL = _pfpURL;
    }

    function getUserProfile(address _user) public view returns (uint256, uint256, string memory) {
        UserProfile memory profile = userProfiles[_user];
        return (profile.username, profile.bio, profile.pfpURL);
    }
    
    // carvings (posts)

    function createCarving(uint256 _message) public {
        Carving memory newCarving = Carving({
            message: _message,
            carver: msg.sender,
            timestamp: block.timestamp
        });
        carvings.push(newCarving);
        uint256 carvingId = carvings.length - 1;
        userCarvings[msg.sender].push(carvingId);
        emit CarvingCreated(msg.sender, carvingId, _message);
    }

    function getCarvings(uint256 start, uint256 count) public view returns (Carving[] memory) {
        require(start < carvings.length, "Start index out of bounds");
        uint256 end = start + count;
        if (end > carvings.length) {
            end = carvings.length;
        }
        uint256 length = end - start;
        Carving[] memory result = new Carving[](length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = carvings[start + i];
        }
        return result;
    }

    function getCarvingsCount() public view returns (uint256) {
        return carvings.length;
    }

    function getUserCarvings(address _user, uint256 start, uint256 count) public view returns (Carving[] memory) {
        uint256[] memory userCarvingIds = userCarvings[_user];
        require(start < userCarvingIds.length, "Start index out of bounds");
        uint256 end = start + count;
        if (end > userCarvingIds.length) {
            end = userCarvingIds.length;
        }
        uint256 length = end - start;
        Carving[] memory result = new Carving[](length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = carvings[userCarvingIds[start + i]];
        }
        return result;
    }
    
    // likes

    function likeCarving(uint256 _carvingId) public {
        require(_carvingId < carvings.length, "Invalid carving ID");
        require(!carvingLikedBy[_carvingId][msg.sender], "Already liked");

        carvingLikes[_carvingId] += 1;
        carvingLikedBy[_carvingId][msg.sender] = true;

        emit CarvingLiked(msg.sender, _carvingId);
    }

    function unlikeCarving(uint256 _carvingId) public {
        require(_carvingId < carvings.length, "Invalid carving ID");
        require(carvingLikedBy[_carvingId][msg.sender], "Not liked yet");
        require(carvingLikes[_carvingId] > 0, "Like count already zero");

        carvingLikes[_carvingId] -= 1;
        carvingLikedBy[_carvingId][msg.sender] = false;

        emit CarvingUnliked(msg.sender, _carvingId);
    }
    
    function hasLikedCarving(address _user, uint256 _carvingId) public view returns (bool) {
        require(_carvingId < carvings.length, "Invalid carving ID");
        return carvingLikedBy[_carvingId][_user];
    }
    
    function getLikesCount(uint256 _carvingId) public view returns (uint256) {
        require(_carvingId < carvings.length, "Invalid carving ID");
        return carvingLikes[_carvingId];
    }
    
    // recarves (reposts)

    function recarve(uint256 _carvingId) public {
        require(_carvingId < carvings.length, "Invalid carving ID");

        recarvings[_carvingId] += 1;

        emit CarvingReposted(msg.sender, _carvingId);
    }
    
    // etches (comments)

    function etchUnderCarving(uint256 _carvingId, uint256 _message) public {
        require(_carvingId < carvings.length, "Invalid carving ID");
        require(_message > 0, "Etch message cannot be empty");

        Etch memory newEtch = Etch({
            message: _message,
            etcher: msg.sender,
            timestamp: block.timestamp
        });
        carvingEtches[_carvingId].push(newEtch);
        uint256 etchId = carvingEtches[_carvingId].length - 1;

        emit EtchAdded(msg.sender, _carvingId, etchId, _message);
    }

    function getEtches(uint256 _carvingId, uint256 start, uint256 count) public view returns (Etch[] memory) {
        require(_carvingId < carvings.length, "Invalid carving ID");
        Etch[] memory etches = carvingEtches[_carvingId];
        require(start < etches.length, "Start index out of bounds");
        uint256 end = start + count;
        if (end > etches.length) {
            end = etches.length;
        }
        uint256 length = end - start;
        Etch[] memory result = new Etch[](length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = etches[start + i];
        }
        return result;
    }

    function getEtchCount(uint256 _carvingId) public view returns (uint256) {
        require(_carvingId < carvings.length, "Invalid carving ID");
        return carvingEtches[_carvingId].length;
    }
}
