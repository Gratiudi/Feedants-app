const mongoose = require("mongoose");

const judgeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    title: { type: String, required: true },
    bio: { type: String },
    photoUrl: { type: String },
    introVideoUrl: { type: String },
    yearsOfExperience: { type: Number },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Judge", judgeSchema);
