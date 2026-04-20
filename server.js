const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const Groq = require("groq-sdk");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Serve static files first
app.use(express.static(__dirname));

// Health route
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Groq backend running",
    apiKeyLoaded: !!process.env.GROQ_API_KEY
  });
});

// Explicit root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function extractFieldFromText(text, fieldName) {
  const regex = new RegExp(`^${fieldName}:\\s*(.*)$`, "im");
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

function computeReviewRecommendation(confidenceText) {
  const confidenceValue = Number(String(confidenceText).replace("%", "").trim());
  if (!Number.isFinite(confidenceValue)) return "Educator Review Required";
  if (confidenceValue >= 80) return "Auto-Process";
  if (confidenceValue >= 60) return "Educator Review Recommended";
  return "Educator Review Required";
}

app.post("/assess", async (req, res) => {
  try {
    const {
      essayPrompt,
      rubric,
      calibration,
      essayText,
      minScore,
      maxScore,
      lowRange,
      mediumRange,
      highRange
    } = req.body;

    if (
      !essayPrompt ||
      !rubric ||
      !calibration ||
      !essayText ||
      !minScore ||
      !maxScore ||
      !lowRange ||
      !mediumRange ||
      !highRange
    ) {
      return res.status(400).json({
        error: "Missing required fields."
      });
    }

    console.log("Before Groq request");

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are a strict academic essay grader. Return only these fields exactly: Final Score, Category, Confidence Level, Reasoning, Feedback."
        },
        {
          role: "user",
          content: `You are an expert essay grader in a hybrid AI-human assessment system.

Essay Prompt:
${essayPrompt}

Rubric:
${rubric}

Calibration Examples:
${calibration}

Scoring Configuration:
- Minimum score: ${minScore}
- Maximum score: ${maxScore}
- Low category range: ${lowRange}
- Medium category range: ${mediumRange}
- High category range: ${highRange}

Student Essay:
${essayText}

Return EXACTLY in this format:

Final Score: <number>
Category: <category>
Confidence Level: <0-100%>
Reasoning: <short explanation>
Feedback: <constructive feedback>`
        }
      ]
    });

    console.log("After Groq request");

    const result =
      completion?.choices?.[0]?.message?.content ||
      `Final Score: ${minScore}
Category: Unknown
Confidence Level: 50%
Reasoning: No model output returned.
Feedback: Please review manually.`;

    let confidenceText = extractFieldFromText(result, "Confidence Level");
    if (!confidenceText) confidenceText = "0%";

    const reviewRecommendation = computeReviewRecommendation(confidenceText);

    res.json({ result, reviewRecommendation });
  } catch (error) {
    console.error("BACKEND ERROR:", error);
    res.status(500).json({
      error: error.message || "Server error"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});