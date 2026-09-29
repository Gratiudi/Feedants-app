require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
const Competition = require("./src/models/Competition");
const Judge = require("./src/models/Judge");
const User = require("./src/models/User");
const Registration = require("./src/models/Registration");
const Submission = require("./src/models/Submission");
const Result = require("./src/models/Result");
const authRoutes = require("./src/routes/auth");
const { requireAuth, requireAdmin, optionalAuth } = require("./src/middleware/auth");

const app = express();
const PORT = process.env.PORT || 5000;

function deriveCompetitionStatus(competition, now = new Date()) {
  const registrationStatus =
    now <= new Date(competition.registerBefore) &&
    competition.spotsBooked < competition.totalSpots
      ? "open"
      : "closed";

  const submissionStatus =
    now < new Date(competition.submissionStart)
      ? "not_started"
      : now <= new Date(competition.submissionEnd)
        ? "open"
        : "closed";

  return { registrationStatus, submissionStatus };
}

async function getUserCompetitionState(userId, competitionId) {
  const registration = await Registration.findOne({ userId, competitionId });
  if (!registration) {
    return { registrationStatus: "not_registered", submissionStatus: "not_submitted", resultStatus: "pending" };
  }

  const submission = await Submission.findOne({ userId, competitionId });
  const submissionStatus = submission ? "submitted" : "not_submitted";

  let resultStatus = "pending";
  const won = await Result.findOne({ competitionId, "winners.userId": userId });
  if (won) resultStatus = "won";
  else {
    const announced = await Result.findOne({ competitionId });
    if (announced) resultStatus = "lost";
  }

  return {
    registrationStatus: "registered",
    submissionStatus,
    resultStatus,
  };
}

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Public: browsing competitions doesn't require login
app.get("/api/competitions", async (req, res) => {
  try {
    const competitions = await Competition.find().populate("judgeId").sort({ createdAt: -1 });
    res.json(competitions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/competitions/:id", async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id).populate("judgeId");
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" });
    }
    res.json(competition);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// State is personal (registration/submission status for the caller),
// but should still work for logged-out users browsing — so auth is optional here.
// If a token is present we use it; if not, we just show competition-level status.
app.get("/api/competitions/:id/state", optionalAuth, async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id);
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" });
    }

    const userId = req.user?.userId; // only set if a valid token was sent (see optionalAuth note below)

    const userState = userId
      ? await getUserCompetitionState(userId, competition._id)
      : { registrationStatus: "not_registered", submissionStatus: "not_submitted", resultStatus: "pending" };

    const { registrationStatus, submissionStatus } = deriveCompetitionStatus(competition);

    let buttonText = "Register";
    if (userState.registrationStatus === "registered") {
      if (submissionStatus === "not_started") buttonText = "Submission opens soon";
      else if (submissionStatus === "open" && userState.submissionStatus === "not_submitted") buttonText = "Upload Submission";
      else if (submissionStatus === "open" && userState.submissionStatus === "submitted") buttonText = "Submitted — Registered";
      else if (submissionStatus === "closed" && userState.resultStatus === "pending") buttonText = "Awaiting Results";
      else if (userState.resultStatus === "won" || userState.resultStatus === "lost") buttonText = "View Results";
    } else if (registrationStatus === "closed") {
      buttonText = "Registration Closed";
    }

    res.json({
      competition,
      registrationStatus,
      submissionStatus,
      userState,
      buttonText,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin-only: creating competitions shouldn't be public
app.post("/api/competitions", requireAuth, requireAdmin, async (req, res) => {
  try {
    const competition = await Competition.create(req.body);
    res.status(201).json(competition);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/api/competitions/:id/register", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId; // trust the token, not the body

    const competition = await Competition.findById(req.params.id);
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" });
    }

    const { registrationStatus } = deriveCompetitionStatus(competition);
    if (registrationStatus !== "open") {
      return res.status(400).json({ message: "Registration is closed" });
    }

    const alreadyRegistered = await Registration.findOne({ userId, competitionId: competition._id });
    if (alreadyRegistered) {
      return res.status(409).json({ message: "You are already registered" });
    }

    const updatedCompetition = await Competition.findOneAndUpdate(
      { _id: competition._id, spotsBooked: { $lt: competition.totalSpots } },
      { $inc: { spotsBooked: 1 } },
      { new: true },
    );

    if (!updatedCompetition) {
      return res.status(400).json({ message: "Competition is full" });
    }

    const registration = await Registration.create({
      userId,
      competitionId: competition._id,
      registeredAt: new Date(),
    });

    return res.status(201).json({ registration, competition: updatedCompetition });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ message: "You are already registered" });
    }
    return res.status(500).json({ message: error.message });
  }
});

app.post("/api/competitions/:id/submissions", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId; // trust the token, not the body
    const { registrationId, fileUrl, mediaUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ message: "fileUrl is required" });
    }

    const competition = await Competition.findById(req.params.id);
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" });
    }

    const { submissionStatus } = deriveCompetitionStatus(competition);
    if (submissionStatus !== "open") {
      return res.status(400).json({ message: "Submissions are closed" });
    }

    let registration = registrationId
      ? await Registration.findById(registrationId)
      : await Registration.findOne({ userId, competitionId: competition._id });

    if (!registration) {
      return res.status(403).json({ message: "User is not registered for this competition" });
    }

    // also make sure the registration actually belongs to this caller
    if (String(registration.userId) !== String(userId)) {
      return res.status(403).json({ message: "Registration does not belong to this user" });
    }

    if (String(registration.competitionId) !== String(competition._id)) {
      return res.status(403).json({ message: "Registration does not match this competition" });
    }

    const existingSubmission = await Submission.findOne({ userId, competitionId: competition._id });
    if (existingSubmission) {
      return res.status(409).json({ message: "Submission already exists for this user and competition" });
    }

    const submission = await Submission.create({
      userId,
      registrationId: registration._id,
      competitionId: competition._id,
      fileUrl,
      mediaUrl: mediaUrl || fileUrl,
      submittedAt: new Date(),
    });

    return res.status(201).json(submission);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.get("/api/competitions/:id/results", async (req, res) => {
  try {
    const result = await Result.findOne({ competitionId: req.params.id }).populate("winners.userId");
    if (!result) {
      return res.status(404).json({ message: "Results not found" });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin-only: replaces the old shared-secret header check
app.post("/api/competitions/:id/results", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { winners } = req.body;
    if (!Array.isArray(winners) || winners.length === 0) {
      return res.status(400).json({ message: "winners array is required" });
    }

    const competition = await Competition.findById(req.params.id);
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" });
    }

    const result = await Result.findOneAndUpdate(
      { competitionId: competition._id },
      {
        competitionId: competition._id,
        winners,
        announcedAt: new Date(),
      },
      { upsert: true, new: true },
    );

    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.get("/api/judges", async (req, res) => {
  try {
    const judges = await Judge.find().sort({ createdAt: -1 });
    res.json(judges);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin-only: listing every user is sensitive (PII: email, phone)
app.get("/api/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin-only: full registration list across all users
app.get("/api/registrations", requireAuth, requireAdmin, async (req, res) => {
  try {
    const registrations = await Registration.find().populate("userId").populate("competitionId");
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin-only: full submission list across all users
app.get("/api/submissions", requireAuth, requireAdmin, async (req, res) => {
  try {
    const submissions = await Submission.find().populate("userId").populate("competitionId");
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/results", async (req, res) => {
  try {
    const results = await Result.find().populate("winners.userId").sort({ announcedAt: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: "Something went wrong" });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });

module.exports = app;