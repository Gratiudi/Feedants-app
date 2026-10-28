require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Judge = require("../models/Judge");
const Competition = require("../models/Competition");

async function seed() {
  await connectDB();

  const judgeSeeds = [
    {
      name: "Mulatu Astatke",
      title: "Master of Ethio-Jazz & Composer",
      bio: "World-renowned vibraphonist, composer, and father of Ethio-jazz, judging musical composition, rhythm, and artistic depth.",
      photoUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
      yearsOfExperience: 40,
    },
    {
      name: "Liya Kebede",
      title: "International Creative Director & Fashion Icon",
      bio: "Global cultural ambassador, model, and designer evaluating visual aesthetics, stage presence, and creative direction.",
      photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
      yearsOfExperience: 22,
    },
    {
      name: "Melaku Belay",
      title: "Master Traditional Dancer & Cultural Ambassador",
      bio: "Celebrated director of Fendika Cultural Centre, renowned virtuoso of Eskista, East African rhythms, and expressive movement.",
      photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
      yearsOfExperience: 25,
    },
    {
      name: "Elena Rostova",
      title: "International Orchestral Conductor & Juror",
      bio: "Concert adjudicator and conductor across European and Pan-African arts festivals, evaluating vocal control, harmony, and stagecraft.",
      photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
      yearsOfExperience: 18,
    },
  ];
  const judges = await Promise.all(
    judgeSeeds.map((judge) =>
      Judge.findOneAndUpdate(
        { name: judge.name },
        { $setOnInsert: judge },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    ),
  );

  // 2. Seed Ethiopian & International Competitions
  const competitionSeeds = [
    {
      title: "Addis Ethio-Jazz & Acoustic Innovation Cup",
      description: "An open competition celebrating original compositions and acoustic arrangements blending African modalities, jazz improvisation, and global rhythms.",
      tags: ["Music", "Ethio-Jazz", "Acoustic", "Live Performance"],
      judgeId: judges[0]._id,
      prizePool: 350000,
      entryFee: 500,
      totalSpots: 30,
      registerBefore: new Date("2026-11-15T00:00:00.000Z"),
      submissionStart: new Date("2026-10-20T00:00:00.000Z"),
      submissionEnd: new Date("2026-11-25T00:00:00.000Z"),
      resultDate: new Date("2026-12-05T00:00:00.000Z"),
      rewards: [
        { position: 1, amount: 200000 },
        { position: 2, amount: 100000 },
        { position: 3, amount: 50000 },
      ],
      judgingParameters: "Composition originality, modal harmony, rhythmic groove, live dynamics",
      rulesAndEligibility: "Open to soloists and ensembles globally. Submissions must feature original instrumentation or unique arrangements.",
      refundPolicy: "Full refund available up to 72 hours before registration deadline.",
    },
    {
      title: "Horn of Africa Traditional & Eskista Championship",
      description: "Celebrating traditional folk dance traditions from Ethiopia and East Africa, highlighting regional authenticity, shoulder movements (Eskista), and rhythmic synergy.",
      tags: ["Dance", "Traditional", "Eskista", "Cultural Heritage"],
      judgeId: judges[2]._id,
      prizePool: 250000,
      entryFee: 350,
      totalSpots: 25,
      registerBefore: new Date("2026-11-30T00:00:00.000Z"),
      submissionStart: new Date("2026-11-10T00:00:00.000Z"),
      submissionEnd: new Date("2026-12-10T00:00:00.000Z"),
      resultDate: new Date("2026-12-20T00:00:00.000Z"),
      rewards: [
        { position: 1, amount: 150000 },
        { position: 2, amount: 70000 },
        { position: 3, amount: 30000 },
      ],
      judgingParameters: "Authenticity, tempo accuracy, posture, emotional resonance, costume fidelity",
      rulesAndEligibility: "Solo or duo dancers. High-definition uncut video of at least 2 minutes required.",
      refundPolicy: "Non-refundable after registration confirmation.",
    },
    {
      title: "Pan-African Visual Arts & Digital Storytelling Grand Prix",
      description: "An international stage for digital creators, visual artists, and short filmmakers exploring contemporary African identity, futurism, and storytelling.",
      tags: ["Art", "Digital Media", "Storytelling", "Short Film"],
      judgeId: judges[1]._id,
      prizePool: 400000,
      entryFee: 600,
      totalSpots: 40,
      registerBefore: new Date("2026-12-15T00:00:00.000Z"),
      submissionStart: new Date("2026-11-20T00:00:00.000Z"),
      submissionEnd: new Date("2026-12-25T00:00:00.000Z"),
      resultDate: new Date("2027-01-10T00:00:00.000Z"),
      rewards: [
        { position: 1, amount: 250000 },
        { position: 2, amount: 100000 },
        { position: 3, amount: 50000 },
      ],
      judgingParameters: "Narrative clarity, visual composition, aesthetic uniqueness, emotional impact",
      rulesAndEligibility: "Submissions must be original digital artwork or short videos under 5 minutes.",
      refundPolicy: "Refunds applicable if event is rescheduled or cancelled.",
    },
    {
      title: "Global Vocalist & Singer-Songwriter Open",
      description: "An international vocal tournament open to all languages and musical styles. Judges assess pitch accuracy, emotional timbre, vocal versatility, and delivery.",
      tags: ["Singing", "Vocal", "International", "Acoustic"],
      judgeId: judges[3]._id,
      prizePool: 300000,
      entryFee: 450,
      totalSpots: 35,
      registerBefore: new Date("2026-11-20T00:00:00.000Z"),
      submissionStart: new Date("2026-11-05T00:00:00.000Z"),
      submissionEnd: new Date("2026-12-01T00:00:00.000Z"),
      resultDate: new Date("2026-12-12T00:00:00.000Z"),
      rewards: [
        { position: 1, amount: 180000 },
        { position: 2, amount: 80000 },
        { position: 3, amount: 40000 },
      ],
      judgingParameters: "Vocal range, tone quality, pitch accuracy, emotional phrasing",
      rulesAndEligibility: "Live vocals recorded without autotune or heavy vocal processing.",
      refundPolicy: "Refundable up to 5 days prior to submission start.",
    },
    {
      title: "Urban Afro-Fusion & Street Dance Clash",
      description: "High-octane choreography battle combining street dance, Afrobeats footwork, and contemporary physical theatre.",
      tags: ["Dance", "Afrobeats", "Street Dance", "Fusion"],
      judgeId: judges[2]._id,
      prizePool: 220000,
      entryFee: 300,
      totalSpots: 30,
      registerBefore: new Date("2026-12-05T00:00:00.000Z"),
      submissionStart: new Date("2026-11-25T00:00:00.000Z"),
      submissionEnd: new Date("2026-12-20T00:00:00.000Z"),
      resultDate: new Date("2026-12-30T00:00:00.000Z"),
      rewards: [
        { position: 1, amount: 130000 },
        { position: 2, amount: 60000 },
        { position: 3, amount: 30000 },
      ],
      judgingParameters: "Musicality, execution, synchronization, charisma, originality",
      rulesAndEligibility: "Solo and crew entries up to 4 members are accepted.",
      refundPolicy: "No refunds after registration closure.",
    },
  ];
  const competitions = await Promise.all(
    competitionSeeds.map((competition) =>
      Competition.findOneAndUpdate(
        { title: competition.title },
        { $setOnInsert: competition },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    ),
  );

  console.log("Recruiter-preview catalog seeded without overwriting existing records.");
  console.log({ judges: judges.length, competitions: competitions.length });

  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
