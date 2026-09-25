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

const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || "dev-admin-secret";

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

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

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

app.get("/api/competitions/:id/state", async (req, res) => {
  try {
    const { userId } = req.query;
    const competition = await Competition.findById(req.params.id);
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" });
    }

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

app.post("/api/competitions", async (req, res) => {
  try {
    const competition = await Competition.create(req.body);
    res.status(201).json(competition);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/api/competitions/:id/register", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

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

app.post("/api/competitions/:id/submissions", async (req, res) => {
  try {
    const { userId, registrationId, fileUrl, mediaUrl } = req.body;
    if (!userId || !fileUrl) {
      return res.status(400).json({ message: "userId and fileUrl are required" });
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

app.post("/api/competitions/:id/results", async (req, res) => {
  try {
    const secretHeader = req.headers["x-admin-secret"];
    if (ADMIN_SECRET && secretHeader !== ADMIN_SECRET) {
      return res.status(403).json({ message: "Admin access required" });
    }

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

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/registrations", async (req, res) => {
  try {
    const registrations = await Registration.find().populate("userId").populate("competitionId");
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/submissions", async (req, res) => {
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
