const mongoose = require("mongoose");

const rewardSchema = new mongoose.Schema(
  {
    position: { type: Number, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false },
);

const competitionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    tags: [{ type: String }],
    judgeId: { type: mongoose.Schema.Types.ObjectId, ref: "Judge" },

    prizePool: { type: Number, required: true },
    entryFee: { type: Number, required: true },

    totalSpots: { type: Number, required: true },
    spotsBooked: { type: Number, default: 0 },

    registerBefore: { type: Date, required: true },
    submissionStart: { type: Date, required: true },
    submissionEnd: { type: Date, required: true },
    resultDate: { type: Date, required: true },

    rewards: [rewardSchema],
    judgingParameters: { type: String },
    rulesAndEligibility: { type: String },
    refundPolicy: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Competition", competitionSchema);
