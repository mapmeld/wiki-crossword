const mongoose = require('mongoose');

const gameSchema = mongoose.Schema({
  language: String,
  clues: Object,
  image: String
});

module.exports = mongoose.model('Game', gameSchema);
