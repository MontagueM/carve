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

    struct Comment {
        address commenter;
        string message;
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
    mapping(uint256 => uint256) public carvingReposts; // carvingId => repost count

    // Comments system
    mapping(uint256 => Comment[]) public carvingComments; // carvingId => comments

    event UserCreated(address indexed user);
    event UsernameUpdated(address indexed user, uint256 newUsername);
    event BioUpdated(address indexed user, uint256 newBio);
    event PfpURLUpdated(address indexed user, string newPfpURL);
    event CarvingCreated(address indexed user, uint256 carvingId, uint256 message);
    event CarvingLiked(address indexed user, uint256 carvingId);
    event CarvingUnliked(address indexed user, uint256 carvingId);
    event CarvingReposted(address indexed user, uint256 carvingId);
    event CommentAdded(address indexed user, uint256 carvingId, uint256 commentId, string message);

    // Internal function to check if the user is new
    function _isNewUser(address _user) internal view returns (bool) {
        return bytes(userProfiles[_user].pfpURL).length == 0 &&
        userProfiles[_user].username == 0 &&
            userProfiles[_user].bio == 0;
    }

    // Check if a user profile exists
    function _isUser(address _user) internal view returns (bool) {
        return userProfiles[_user].username != 0;
    }

    // Create or update username
    function setUsername(uint256 _username) public {
        if (_isNewUser(msg.sender)) {
            emit UserCreated(msg.sender);
        } else {
            emit UsernameUpdated(msg.sender, _username);
        }
        userProfiles[msg.sender].username = _username;
    }

    // Update bio
    function setBio(uint256 _bio) public {
        require(_isUser(msg.sender), "Profile does not exist");
        emit BioUpdated(msg.sender, _bio);
        userProfiles[msg.sender].bio = _bio;
    }

    // Update profile picture URL
    function setPfpURL(string memory _pfpURL) public {
        require(_isUser(msg.sender), "Profile does not exist");
        require(bytes(_pfpURL).length <= MAX_PFP_URL_LENGTH, "PfpURL exceeds maximum length of 128 characters");

        emit PfpURLUpdated(msg.sender, _pfpURL);
        userProfiles[msg.sender].pfpURL = _pfpURL;
    }

    // Get user profile
    function getUserProfile(address _user) public view returns (uint256, uint256, string memory) {
        UserProfile memory profile = userProfiles[_user];
        return (profile.username, profile.bio, profile.pfpURL);
    }

    // Create a carving
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

    // Get carvings with pagination
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

    // Get total carvings count
    function getCarvingsCount() public view returns (uint256) {
        return carvings.length;
    }

    // Get a specific user's carvings with pagination
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

    // Like a carving
    function likeCarving(uint256 _carvingId) public {
        require(_carvingId < carvings.length, "Invalid carving ID");
        require(!carvingLikedBy[_carvingId][msg.sender], "Already liked");

        carvingLikes[_carvingId] += 1;
        carvingLikedBy[_carvingId][msg.sender] = true;

        emit CarvingLiked(msg.sender, _carvingId);
    }

    // Unlike a carving
    function unlikeCarving(uint256 _carvingId) public {
        require(_carvingId < carvings.length, "Invalid carving ID");
        require(carvingLikedBy[_carvingId][msg.sender], "Not liked yet");
        require(carvingLikes[_carvingId] > 0, "Like count already zero");

        carvingLikes[_carvingId] -= 1;
        carvingLikedBy[_carvingId][msg.sender] = false;

        emit CarvingUnliked(msg.sender, _carvingId);
    }

    // Repost a carving
    function repostCarving(uint256 _carvingId) public {
        require(_carvingId < carvings.length, "Invalid carving ID");

        carvingReposts[_carvingId] += 1;

        // Optionally, create a new carving as a repost (if desired)
        // For simplicity, just incrementing the repost count

        emit CarvingReposted(msg.sender, _carvingId);
    }

    // Add a comment to a carving
    function commentOnCarving(uint256 _carvingId, string memory _message) public {
        require(_carvingId < carvings.length, "Invalid carving ID");
        require(bytes(_message).length > 0, "Comment cannot be empty");

        Comment memory newComment = Comment({
            commenter: msg.sender,
            message: _message,
            timestamp: block.timestamp
        });
        carvingComments[_carvingId].push(newComment);
        uint256 commentId = carvingComments[_carvingId].length - 1;

        emit CommentAdded(msg.sender, _carvingId, commentId, _message);
    }

    // Get comments for a carving with pagination
    function getComments(uint256 _carvingId, uint256 start, uint256 count) public view returns (Comment[] memory) {
        require(_carvingId < carvings.length, "Invalid carving ID");
        Comment[] memory comments = carvingComments[_carvingId];
        require(start < comments.length, "Start index out of bounds");
        uint256 end = start + count;
        if (end > comments.length) {
            end = comments.length;
        }
        uint256 length = end - start;
        Comment[] memory result = new Comment[](length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = comments[start + i];
        }
        return result;
    }

    // Get total comments count for a carving
    function getCommentsCount(uint256 _carvingId) public view returns (uint256) {
        require(_carvingId < carvings.length, "Invalid carving ID");
        return carvingComments[_carvingId].length;
    }
}
