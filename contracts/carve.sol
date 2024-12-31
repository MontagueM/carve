// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8; // >=0.8.8 recommended for user-defined value types
    
type CarvingId is uint256;
import "hardhat/console.sol";

contract carve {
    struct UserProfile {
        uint256 createdAt;
        string username;
        string bio;
        string pfpURL;
        string backgroundURL;
    }

    enum CarvingType { Carve, Quote, Recarve, Etch }

    struct Carving {
        CarvingId id;                // unique ID
        CarvingId originalCarvingId; // for a quote or recarve, the original carving ID; for an etch, the carving ID it's under
        uint256 sentAt;              // timestamp
        address carver;              // who created it
        CarvingType carvingType;     // what type of carving it is
        bool hidden;                 // a flag to mark if carving should not be displayed (soft delete)
        string message;              // empty for recarves
    }
    
    struct CarvingView {
        CarvingId id;
        CarvingId originalCarvingId;
        uint256 sentAt;
        uint256 likeCount;
        uint256 recarveCount;
        uint256 etchCount;
        address carver;
        CarvingType carvingType;
        bool hidden;
        bool likedByUser;
        string message;
    }

    // Store user profiles
    mapping(address => UserProfile) public userProfiles;

    // Global list of carvings
    Carving[] public carvings;

    // Mapping from user address to their carving IDs
    mapping(address => CarvingId[]) public userCarvings;

    // Likes system
    mapping(CarvingId => uint256) public carvingLikeCounts;
    mapping(CarvingId => mapping(address => bool)) public carvingLikedBy;

    // Recarves system
    mapping(CarvingId => uint256) public carvingRecarveCounts;

    // Etching system
    mapping(CarvingId => CarvingId[]) public carvingEtches; // carvingId => array of Etch IDs

    // Followers/Following System
    mapping(address => address[]) private _followings;
    mapping(address => mapping(address => uint256)) private _followingIndex;

    mapping(address => address[]) private _followers;
    mapping(address => mapping(address => uint256)) private _followerIndex;

    // Events
    event UserCreated(address indexed user);
    event UsernameUpdated(address indexed user, string newUsername);
    event BioUpdated(address indexed user, string newBio);
    event PfpURLUpdated(address indexed user, string newPfpURL);
    event BackgroundURLUpdated(address indexed user, string newBackgroundURL);

    event CarvingCreated(address indexed user, CarvingId carvingId, string message);
    event CarvingLiked(address indexed user, CarvingId carvingId);
    event CarvingUnliked(address indexed user, CarvingId carvingId);
    event CarvingRecarved(address indexed user, CarvingId carvingId);
    event EtchAdded(address indexed user, CarvingId carvingId, CarvingId etchId, string message);

    event UserFollowed(address indexed follower, address indexed followedUser);
    event UserUnfollowed(address indexed follower, address indexed unfollowedUser);

    // ------------------------- Internal helpers -------------------------

    function _isNewUser(address _user) internal view returns (bool) {
        // Check if the user has not set any username yet
        return bytes(userProfiles[_user].username).length == 0;
    }

    function _isUser(address _user) internal view returns (bool) {
        return !_isNewUser(_user);
    }

    function _addCarving(CarvingType carvingType, string memory message, CarvingId originalCarvingId) internal returns (Carving memory)
    {
        CarvingId newId = CarvingId.wrap(carvings.length);
        Carving memory newCarving = Carving({
            id: newId,
            carvingType: carvingType,
            carver: msg.sender,
            message: message,
            sentAt: block.timestamp,
            originalCarvingId: originalCarvingId,
            hidden: false
        });

        carvings.push(newCarving);
        userCarvings[msg.sender].push(newId);

        return newCarving;
    }

    // ------------------------- Profile functions -------------------------

    function setUsername(string memory _username) public {
        console.log("setUsername called with:", _username);
        require(bytes(_username).length <= 32, "Username must be 32 characters or less");

        if (_isNewUser(msg.sender)) {
            // First-time user
            userProfiles[msg.sender].createdAt = block.timestamp;
            emit UserCreated(msg.sender);
        } else {
            // Updating existing user's username
            emit UsernameUpdated(msg.sender, _username);
        }

        userProfiles[msg.sender].username = _username;
        console.log("Username set to:", _username);
    }

    function setBio(string memory _bio) public {
        require(_isUser(msg.sender), "Profile does not exist");
        emit BioUpdated(msg.sender, _bio);
        userProfiles[msg.sender].bio = _bio;
    }

    function setPfpURL(string memory _pfpURL) public {
        require(_isUser(msg.sender), "Profile does not exist");
        emit PfpURLUpdated(msg.sender, _pfpURL);
        userProfiles[msg.sender].pfpURL = _pfpURL;
    }

    function setBackgroundURL(string memory _backgroundURL) public {
        require(_isUser(msg.sender), "Profile does not exist");
        emit BackgroundURLUpdated(msg.sender, _backgroundURL);
        userProfiles[msg.sender].backgroundURL = _backgroundURL;
    }

    function getUserProfile(address _user) public view returns (
        uint256 createdAt,
        string memory username,
        string memory bio,
        string memory pfpURL,
        string memory backgroundURL,
        uint256 followerCount,
        uint256 followingCount,
        uint256 carvingCount
    )
    {
        UserProfile memory profile = userProfiles[_user];
        uint256 followerCount_ = _followers[_user].length;
        uint256 followingCount_ = _followings[_user].length;
        uint256 carvingCount_ = userCarvings[_user].length;
        return (
            profile.createdAt,
            profile.username,
            profile.bio,
            profile.pfpURL,
            profile.backgroundURL,
            followerCount_,
            followingCount_,
            carvingCount_
        );
    }

    // ------------------------- Carving (posts) -------------------------

    function createCarving(string memory _message) public {
        require(_isUser(msg.sender), "Profile does not exist");

        Carving memory newCarving = _addCarving(CarvingType.Carve, _message, CarvingId.wrap(0));

        emit CarvingCreated(newCarving.carver, newCarving.id, newCarving.message);
    }

    function getCarvingsCount() public view returns (uint256) {
        return carvings.length;
    }

    function getCarving(uint256 carvingIndex) public view returns (CarvingView memory)
    {
        require(carvingIndex < carvings.length, "Invalid carving ID");
        CarvingView memory result;
        result.id = carvings[carvingIndex].id;
        result.originalCarvingId = carvings[carvingIndex].originalCarvingId;
        result.sentAt = carvings[carvingIndex].sentAt;
        result.carver = carvings[carvingIndex].carver;
        result.carvingType = carvings[carvingIndex].carvingType;
        result.hidden = carvings[carvingIndex].hidden;
        result.message = carvings[carvingIndex].message;

        result.likeCount = carvingLikeCounts[result.id];
        result.recarveCount = carvingRecarveCounts[result.id];
        result.etchCount = carvingEtches[result.id].length;
        result.likedByUser = carvingLikedBy[result.id][msg.sender];
        return result;
    }
    
    // Get a range of all carvings in the global feed
    function getCarvings(uint256 start, uint256 count) public view returns (CarvingView[] memory)
    {
        require(start < carvings.length, "Start index out of bounds");
        uint256 end = start + count;
        if (end > carvings.length) {
            end = carvings.length;
        }
        uint256 length = end - start;
        CarvingView[] memory result = new CarvingView[](length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = getCarving(start + i);
        }
        return result;
    }

    // Get a range of carvings created by a specific user
    function getUserCarvings(address _user, uint256 start, uint256 count) public view returns (CarvingView[] memory)
    {
        CarvingId[] memory userCarvingIds = userCarvings[_user];
        require(start < userCarvingIds.length, "Start index out of bounds");
        uint256 end = start + count;
        if (end > userCarvingIds.length) {
            end = userCarvingIds.length;
        }
        uint256 length = end - start;
        CarvingView[] memory result = new CarvingView[](length);
        for (uint256 i = 0; i < length; i++) {
            uint256 carvingIndex = CarvingId.unwrap(userCarvingIds[start + i]);
            result[i] = getCarving(carvingIndex);
        }
        return result;
    }
    
    function getUserCarvingsCount(address _user) public view returns (uint256) {
        return userCarvings[_user].length;
    }

    // ------------------------- Likes -------------------------

    function likeCarving(CarvingId _carvingId) public {
        uint256 carvingIndex = CarvingId.unwrap(_carvingId);
        require(carvingIndex < carvings.length, "Invalid carving ID");
        require(!carvingLikedBy[_carvingId][msg.sender], "Already liked");

        carvingLikeCounts[_carvingId] += 1;
        carvingLikedBy[_carvingId][msg.sender] = true;

        emit CarvingLiked(msg.sender, _carvingId);
    }

    function unlikeCarving(CarvingId _carvingId) public {
        uint256 carvingIndex = CarvingId.unwrap(_carvingId);
        require(carvingIndex < carvings.length, "Invalid carving ID");
        require(carvingLikedBy[_carvingId][msg.sender], "Not liked yet");
        require(carvingLikeCounts[_carvingId] > 0, "Like count already zero");

        carvingLikeCounts[_carvingId] -= 1;
        carvingLikedBy[_carvingId][msg.sender] = false;

        emit CarvingUnliked(msg.sender, _carvingId);
    }

    function hasLikedCarving(address _user, CarvingId _carvingId) public view returns (bool) {
        uint256 carvingIndex = CarvingId.unwrap(_carvingId);
        require(carvingIndex < carvings.length, "Invalid carving ID");
        return carvingLikedBy[_carvingId][_user];
    }

    function getLikesCount(CarvingId _carvingId) public view returns (uint256) {
        uint256 carvingIndex = CarvingId.unwrap(_carvingId);
        require(carvingIndex < carvings.length, "Invalid carving ID");
        return carvingLikeCounts[_carvingId];
    }

    // ------------------------- Recarves (reposts) -------------------------

    function recarve(CarvingId _carvingId) public {
        uint256 carvingIndex = CarvingId.unwrap(_carvingId);
        require(carvingIndex < carvings.length, "Invalid carving ID");
        require(_isUser(msg.sender), "Profile does not exist");

        carvingRecarveCounts[_carvingId] += 1;

        emit CarvingRecarved(msg.sender, _carvingId);
    }

    function getRecarvesCount(CarvingId _carvingId) public view returns (uint256) {
        uint256 carvingIndex = CarvingId.unwrap(_carvingId);
        require(carvingIndex < carvings.length, "Invalid carving ID");
        return carvingRecarveCounts[_carvingId];
    }

    // ------------------------- Etches (comments) -------------------------

    function etchUnderCarving(CarvingId _carvingId, string memory _message) public {
        uint256 carvingIndex = CarvingId.unwrap(_carvingId);
        require(carvingIndex < carvings.length, "Invalid carving ID");
        require(bytes(_message).length > 0, "Etch message cannot be empty");
        require(_isUser(msg.sender), "Profile does not exist");

        // create a new Etch
        Carving memory newEtch = _addCarving(CarvingType.Etch, _message, _carvingId);
        carvingEtches[_carvingId].push(newEtch.id);

        emit EtchAdded(newEtch.carver, newEtch.originalCarvingId, newEtch.id, newEtch.message);
    }

    function getEtches(CarvingId _carvingId, uint256 start, uint256 count) public view returns (CarvingView[] memory)
    {
        uint256 carvingIndex = CarvingId.unwrap(_carvingId);
        require(carvingIndex < carvings.length, "Invalid carving ID");

        CarvingId[] memory etchIds = carvingEtches[_carvingId];
        require(start < etchIds.length, "Start index out of bounds");

        uint256 end = start + count;
        if (end > etchIds.length) {
            end = etchIds.length;
        }
        uint256 length = end - start;

        CarvingView[] memory result = new CarvingView[](length);
        for (uint256 i = 0; i < length; i++) {
            uint256 etchIndex = CarvingId.unwrap(etchIds[start + i]);
            result[i] = getCarving(etchIndex);
        }
        return result;
    }

    function getEtchCount(CarvingId _carvingId) public view returns (uint256) {
        uint256 carvingIndex = CarvingId.unwrap(_carvingId);
        require(carvingIndex < carvings.length, "Invalid carving ID");
        return carvingEtches[_carvingId].length;
    }

    // ------------------------- Follow/Unfollow -------------------------

    function isFollowing(address follower, address followee) public view returns (bool) {
        // Check if followee is in follower's _followings list
        uint256 index = _followingIndex[follower][followee];
        if (index == 0) {
            // If index == 0, either it's the first element or not in the list at all
            if (_followings[follower].length == 0) {
                return false;
            }
            return _followings[follower][0] == followee;
        }
        return true;
    }

    function follow(address _userToFollow) external {
        require(_userToFollow != msg.sender, "Cannot follow self");
        require(!isFollowing(msg.sender, _userToFollow), "Already following");

        _followings[msg.sender].push(_userToFollow);
        _followingIndex[msg.sender][_userToFollow] = _followings[msg.sender].length - 1;

        _followers[_userToFollow].push(msg.sender);
        _followerIndex[_userToFollow][msg.sender] = _followers[_userToFollow].length - 1;

        emit UserFollowed(msg.sender, _userToFollow);
    }

    function unfollow(address _userToUnfollow) external {
        require(isFollowing(msg.sender, _userToUnfollow), "Not following");

        // Remove followee from msg.sender's followings
        uint256 followingIdx = _followingIndex[msg.sender][_userToUnfollow];
        uint256 lastFollowingIdx = _followings[msg.sender].length - 1;
        address lastFollowing = _followings[msg.sender][lastFollowingIdx];

        _followings[msg.sender][followingIdx] = lastFollowing;
        _followings[msg.sender].pop();

        _followingIndex[msg.sender][lastFollowing] = followingIdx;
        delete _followingIndex[msg.sender][_userToUnfollow];

        // Remove msg.sender from _userToUnfollow's followers
        uint256 followerIdx = _followerIndex[_userToUnfollow][msg.sender];
        uint256 lastFollowerIdx = _followers[_userToUnfollow].length - 1;
        address lastFollower = _followers[_userToUnfollow][lastFollowerIdx];

        _followers[_userToUnfollow][followerIdx] = lastFollower;
        _followers[_userToUnfollow].pop();

        _followerIndex[_userToUnfollow][lastFollower] = followerIdx;
        delete _followerIndex[_userToUnfollow][msg.sender];

        emit UserUnfollowed(msg.sender, _userToUnfollow);
    }

    function getFollowings(address user) external view returns (address[] memory) {
        return _followings[user];
    }

    function getFollowers(address user) external view returns (address[] memory) {
        return _followers[user];
    }
}
