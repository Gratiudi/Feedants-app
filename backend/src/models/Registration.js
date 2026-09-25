const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    competitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Competition",
      required: true,
      index: true,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

registrationSchema.index({ userId: 1, competitionId: 1 }, { unique: true });

module.exports = mongoose.model("Registration", registrationSchema);
