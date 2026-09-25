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

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/competitions", async (req, res) => {
  try {
    const competitions = await Competition.find()
      .populate("judgeId")
      .sort({ createdAt: -1 });
    res.json(competitions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/competitions/:id", async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id).populate(
      "judgeId",
    );
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" });
    }
    res.json(competition);
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
    const registrations = await Registration.find()
      .populate("userId")
      .populate("competitionId");
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/submissions", async (req, res) => {
  try {
    const submissions = await Submission.find()
      .populate("userId")
      .populate("competitionId");
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/results", async (req, res) => {
  try {
    const results = await Result.find()
      .populate("winners.userId")
      .sort({ announcedAt: -1 });
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
