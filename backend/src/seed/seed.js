require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Judge = require("../models/Judge");
const User = require("../models/User");
const Competition = require("../models/Competition");
const Registration = require("../models/Registration");
const Submission = require("../models/Submission");
const Result = require("../models/Result");

async function seed() {
  await connectDB();

  await Promise.all([
    Judge.deleteMany({}),
    User.deleteMany({}),
    Competition.deleteMany({}),
    Registration.deleteMany({}),
    Submission.deleteMany({}),
    Result.deleteMany({}),
  ]);

  const judges = await Judge.insertMany([
    {
      name: "Aisha Noor",
      title: "Choreographer",
      bio: "Award-winning choreographer focused on contemporary and folk forms.",
      photoUrl: "https://example.com/judges/aisha.jpg",
      introVideoUrl: "https://example.com/videos/aisha.mp4",
      yearsOfExperience: 12,
    },
    {
      name: "Rohan Mehta",
      title: "Dance Director",
      bio: "Mentor to emerging performers and competition jurors.",
      photoUrl: "https://example.com/judges/rohan.jpg",
      introVideoUrl: "https://example.com/videos/rohan.mp4",
      yearsOfExperience: 15,
    },
  ]);

  const competitions = await Competition.insertMany([
    {
      title: "Feedants Classical Dance Challenge",
      description: "An open classical dance competition for emerging and established performers.",
      tags: ["Dance", "Classical", "Live Performance"],
      judgeId: judges[0]._id,
      prizePool: 250000,
      entryFee: 500,
      totalSpots: 20,
      spotsBooked: 6,
      registerBefore: new Date("2026-10-15T00:00:00.000Z"),
      submissionStart: new Date("2026-09-20T00:00:00.000Z"),
      submissionEnd: new Date("2026-10-05T00:00:00.000Z"),
      resultDate: new Date("2026-10-20T00:00:00.000Z"),
      rewards: [
        { position: 1, amount: 120000 },
        { position: 2, amount: 80000 },
        { position: 3, amount: 50000 },
      ],
      judgingParameters: "Technique, expression, rhythm, stage presence",
      rulesAndEligibility: "Open to registered participants only; no duplicate entries.",
      refundPolicy: "Refunds only before registration closure.",
    },
    {
      title: "Feedants Fusion Moves Weekend",
      description: "A fusion dance challenge blending contemporary, folk, and cinematic styles.",
      tags: ["Fusion", "Contemporary", "Weekend Event"],
      judgeId: judges[1]._id,
      prizePool: 180000,
      entryFee: 400,
      totalSpots: 25,
      spotsBooked: 8,
      registerBefore: new Date("2026-11-10T00:00:00.000Z"),
      submissionStart: new Date("2026-11-01T00:00:00.000Z"),
      submissionEnd: new Date("2026-11-20T00:00:00.000Z"),
      resultDate: new Date("2026-11-30T00:00:00.000Z"),
      rewards: [
        { position: 1, amount: 90000 },
        { position: 2, amount: 60000 },
      ],
      judgingParameters: "Originality, choreography, energy, audience appeal",
      rulesAndEligibility: "Participants must upload valid performance media in the correct format.",
      refundPolicy: "No refunds after registration closes.",
    },
  ]);

  const users = await User.insertMany([
    {
      name: "Nisha Patel",
      email: "nisha@example.com",
      phone: "9876543210",
      photoUrl: "https://example.com/users/nisha.jpg",
      referralCode: "NISHA2026",
    },
    {
      name: "Karan Shah",
      email: "karan@example.com",
      phone: "9123456780",
      photoUrl: "https://example.com/users/karan.jpg",
      referralCode: "KARAN2026",
    },
    {
      name: "Mira Sen",
      email: "mira@example.com",
      phone: "9988776655",
      photoUrl: "https://example.com/users/mira.jpg",
      referralCode: "MIRA2026",
    },
  ]);

  const registrations = await Registration.insertMany([
    {
      userId: users[0]._id,
      competitionId: competitions[0]._id,
      registeredAt: new Date(),
    },
    {
      userId: users[1]._id,
      competitionId: competitions[0]._id,
      registeredAt: new Date(),
    },
    {
      userId: users[2]._id,
      competitionId: competitions[1]._id,
      registeredAt: new Date(),
    },
  ]);

  const submission = await Submission.create({
    userId: users[0]._id,
    registrationId: registrations[0]._id,
    competitionId: competitions[0]._id,
    fileUrl: "https://example.com/submissions/nisha.mp4",
    mediaUrl: "https://example.com/submissions/nisha.mp4",
    submittedAt: new Date(),
  });

  await Result.create({
    competitionId: competitions[0]._id,
    winners: [
      { userId: users[0]._id, position: 1, prizeAwarded: 120000 },
      { userId: users[1]._id, position: 2, prizeAwarded: 80000 },
    ],
    announcedAt: new Date(),
  });

  console.log("Database seeded successfully.");
  console.log({ judges: judges.length, users: users.length, competitions: competitions.length, registrations: registrations.length, submission: submission._id });

  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
