const Groq = require("groq-sdk");

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

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

Use the educator-provided essay prompt, rubric, calibration examples, and scoring configuration to assess the student essay.

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

Instructions:
- Predict a final numerical score within the provided score range only.
- Assign the category according to the educator-defined category ranges only.
- Return a confidence level as a percentage.
- Provide short reasoning.
- Provide constructive student feedback.

Return EXACTLY in this format:

Final Score: <number>
Category: <category>
Confidence Level: <0-100%>
Reasoning: <short explanation>
Feedback: <constructive feedback>`
        }
      ]
    });

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

    return res.status(200).json({ result, reviewRecommendation });
  } catch (error) {
    console.error("Vercel API error:", error);

    return res.status(500).json({
      error: error.message || "Server error"
    });
  }
};
