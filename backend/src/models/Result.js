const mongoose = require("mongoose");

const winnerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    position: {
      type: Number,
      required: true,
    },
    prizeAwarded: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

const resultSchema = new mongoose.Schema(
  {
    competitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Competition",
      required: true,
      unique: true,
      index: true,
    },
    winners: [winnerSchema],
    announcedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Result", resultSchema);
