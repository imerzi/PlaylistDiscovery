const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: String,
    spotifyId: String,
    thumbnail: String,
    userAccessToken: String,
    userRefreshToken: String,
    userExpiresIn: String,
    reputation: Number
});

const User = mongoose.model('user', userSchema);

module.exports = User;
