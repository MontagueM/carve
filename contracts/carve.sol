// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract carve {
    struct UserProfile {
        uint256 createdAt;
        uint256 username;
        uint256 bio;
        string pfpURL;
        string backgroundURL;
    }

    struct Carving {
        uint256 message;
        address carver;
        uint256 sentAt;
    }

    struct UserCarving {
        uint256 message;
        address carver;
        uint256 sentAt;
        uint256 carvingId; // Index of the carving in the global carvings array
    }

    struct Etch {
        uint256 message;
        address etcher;
        uint256 sentAt;
    }
    
    struct Recarve {
        uint256 recarveSentAt;
        uint256 originalCarvingId;
    }
    
    struct QuoteCarving {
        uint256 quoteMessage;
        address quoteCarver;
        uint256 quoteSentAt;
        uint256 originalCarvingId;
    }

    uint256 public constant MAX_URL_LENGTH = 128;

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

    // Followers/Following System
    mapping(address => mapping(address => bool)) public isFollowing;
    mapping(address => mapping(address => bool)) public isFollowedBy;
    mapping(address => uint256) public followersCounts;
    mapping(address => uint256) public followingCounts;

    event UserCreated(address indexed user);
    event UsernameUpdated(address indexed user, uint256 newUsername);
    event BioUpdated(address indexed user, uint256 newBio);
    event PfpURLUpdated(address indexed user, string newPfpURL);
    event BackgroundURLUpdated(address indexed user, string newBackgroundURL);
    event CarvingCreated(address indexed user, uint256 carvingId, uint256 message);
    event CarvingLiked(address indexed user, uint256 carvingId);
    event CarvingUnliked(address indexed user, uint256 carvingId);
    event CarvingReposted(address indexed user, uint256 carvingId);
    event EtchAdded(address indexed user, uint256 carvingId, uint256 etchId, uint256 message);

    event UserFollowed(address indexed follower, address indexed followedUser);
    event UserUnfollowed(address indexed follower, address indexed unfollowedUser);

    // Internal function to check if the user is new
    function _isNewUser(address _user) internal view returns (bool) {
        return userProfiles[_user].username == 0;
    }

    function _isUser(address _user) internal view returns (bool) {
        return !_isNewUser(_user);
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
        require(bytes(_pfpURL).length <= MAX_URL_LENGTH, "PfpURL exceeds maximum length of 128 characters");

        emit PfpURLUpdated(msg.sender, _pfpURL);
        userProfiles[msg.sender].pfpURL = _pfpURL;
    }
    
    function setBackgroundURL(string memory _backgroundURL) public {
        require(_isUser(msg.sender), "Profile does not exist");
        require(bytes(_backgroundURL).length <= MAX_URL_LENGTH, "BackgroundURL exceeds maximum length of 128 characters");

        emit BackgroundURLUpdated(msg.sender, _backgroundURL);
        userProfiles[msg.sender].backgroundURL = _backgroundURL;
    }

    function getUserProfile(address _user) public view returns (uint256, uint256, string memory) {
        UserProfile memory profile = userProfiles[_user];
        return (profile.username, profile.bio, profile.pfpURL);
    }

    // carvings (posts)

    function createCarving(uint256 _message) public {
        require(_isUser(msg.sender), "Profile does not exist");
        Carving memory newCarving = Carving({
            message: _message,
            carver: msg.sender,
            sentAt: block.timestamp
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

    function getUserCarvings(address _user, uint256 start, uint256 count) public view returns (UserCarving[] memory) {
        uint256[] memory userCarvingIds = userCarvings[_user];
        require(start < userCarvingIds.length, "Start index out of bounds");
        uint256 end = start + count;
        if (end > userCarvingIds.length) {
            end = userCarvingIds.length;
        }
        uint256 length = end - start;
        UserCarving[] memory result = new UserCarving[](length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = carvings[userCarvingIds[start + i]];
            result[i].carvingId = userCarvingIds[start + i];
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
        require(_isUser(msg.sender), "Profile does not exist");

        recarvings[_carvingId] += 1;

        emit CarvingReposted(msg.sender, _carvingId);
    }
    
    function getRecarvesCount(uint256 _carvingId) public view returns (uint256) {
        require(_carvingId < carvings.length, "Invalid carving ID");
        return recarvings[_carvingId];
    }

    // etches (comments)

    function etchUnderCarving(uint256 _carvingId, uint256 _message) public {
        require(_carvingId < carvings.length, "Invalid carving ID");
        require(_message > 0, "Etch message cannot be empty");
        require(_isUser(msg.sender), "Profile does not exist");

        Etch memory newEtch = Etch({
            message: _message,
            etcher: msg.sender,
            sentAt: block.timestamp
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

    // Followers/Following functions

    function followUser(address _userToFollow) public {
        require(_isUser(msg.sender), "You must have a profile to follow others");
        require(_isUser(_userToFollow), "The user you are trying to follow does not have a profile");
        require(_userToFollow != msg.sender, "You cannot follow yourself");
        require(!isFollowing[msg.sender][_userToFollow], "You are already following this user");

        // Mark that msg.sender now follows _userToFollow
        isFollowing[msg.sender][_userToFollow] = true;

        // Add to following and followers list
        followingList[msg.sender].push(_userToFollow);
        followersList[_userToFollow].push(msg.sender);

        emit UserFollowed(msg.sender, _userToFollow);
    }

    function unfollowUser(address _userToUnfollow) public {
        require(_isUser(msg.sender), "You must have a profile to unfollow others");
        require(isFollowing[msg.sender][_userToUnfollow], "You are not following this user");

        // Set following to false
        isFollowing[msg.sender][_userToUnfollow] = false;

        // Emitting event for unfollow
        emit UserUnfollowed(msg.sender, _userToUnfollow);

        // Note: We are not removing the user from arrays here due to gas complexity.
        // The isFollowing mapping will reflect the current state.
        // If you must remove them, you'd need to implement logic to find and remove the entry from the array.
    }

    function getFollowers(address _user) public view returns (address[] memory) {
        return followersList[_user];
    }

    function getFollowing(address _user) public view returns (address[] memory) {
        return followingList[_user];
    }

    function isUserFollowing(address _follower, address _followed) public view returns (bool) {
        return isFollowing[_follower][_followed];
    }
    
    function getFollowersCount(address _user) public view returns (uint256) {
        return followersList[_user].length;
    }
    
    function getFollowingCount(address _user) public view returns (uint256) {
        return followingList[_user].length;
    }
}
