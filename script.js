const assessBtn = document.getElementById("assessBtn");
const approveBtn = document.getElementById("approveBtn");

function extractField(text, fieldName) {
  const regex = new RegExp(
    `^${fieldName}:\\s*([\\s\\S]*?)(?=^(Final Score|Category|Confidence Level|Confidence|Review Recommendation|Reasoning|Feedback):|$)`,
    "im"
  );
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

assessBtn.addEventListener("click", async () => {
  const essayPrompt = document.getElementById("essayPrompt").value.trim();
  const rubric = document.getElementById("rubric").value.trim();
  const calibration = document.getElementById("calibration").value.trim();
  const essayText = document.getElementById("essayText").value.trim();

  const minScore = document.getElementById("minScore").value.trim();
  const maxScore = document.getElementById("maxScore").value.trim();
  const lowRange = document.getElementById("lowRange").value.trim();
  const mediumRange = document.getElementById("mediumRange").value.trim();
  const highRange = document.getElementById("highRange").value.trim();

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
    alert("Please fill in all fields before running the assessment.");
    return;
  }

  document.getElementById("predictedScore").textContent = "Loading...";
  document.getElementById("predictedCategory").textContent = "Loading...";
  document.getElementById("confidenceLevel").textContent = "Loading...";
  document.getElementById("reviewRecommendation").textContent = "Loading...";
  document.getElementById("reasoning").textContent = "Assessing essay...";
  document.getElementById("feedback").textContent = "Generating feedback...";

  try {
    const response = await fetch("/assess", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        essayPrompt,
        rubric,
        calibration,
        essayText,
        minScore,
        maxScore,
        lowRange,
        mediumRange,
        highRange
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Something went wrong.");
    }

    const resultText = data.result || "";

    const finalScore = extractField(resultText, "Final Score");
    const category = extractField(resultText, "Category");

    let confidence = extractField(resultText, "Confidence Level");
    if (!confidence) confidence = extractField(resultText, "Confidence");
    if (!confidence) confidence = "Not returned";

    const reviewRecommendation =
      data.reviewRecommendation || extractField(resultText, "Review Recommendation");

    const reasoning = extractField(resultText, "Reasoning");
    const feedback = extractField(resultText, "Feedback");

    document.getElementById("predictedScore").textContent = finalScore || "-";
    document.getElementById("predictedCategory").textContent = category || "-";
    document.getElementById("confidenceLevel").textContent = confidence || "-";
    document.getElementById("reviewRecommendation").textContent =
      reviewRecommendation || "-";
    document.getElementById("reasoning").textContent = reasoning || resultText;
    document.getElementById("feedback").textContent = feedback || "-";

    document.getElementById("finalScore").value = finalScore || "";
    document.getElementById("finalCategory").value = category || "";
    document.getElementById("finalFeedback").value = feedback || "";
 } catch (error) {
  console.error("✗ BACKEND ERROR:", error);

  res.status(500).json({
    error: `API connection failed: ${error.message}`
  });
}
});

approveBtn.addEventListener("click", () => {
  const finalScore = document.getElementById("finalScore").value;
  const finalCategory = document.getElementById("finalCategory").value;
  const finalFeedback = document.getElementById("finalFeedback").value;

  alert(
    `Final Assessment Approved\n\nScore: ${finalScore}\nCategory: ${finalCategory}\nFeedback: ${finalFeedback}`
  );
});