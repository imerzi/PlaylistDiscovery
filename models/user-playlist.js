const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const playlistSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'user' },
    playlistId: String,
    category: String,
    likes: Number
});

const Playlist = mongoose.model('playlist', playlistSchema);

module.exports = Playlist;
