import { describe, it, expect } from "vitest";
import { embeddingTextFromAnalysis } from "@/lib/embeddings";

describe("embeddingTextFromAnalysis", () => {
  it("combines filename, summary, and insights into one string", () => {
    const result = embeddingTextFromAnalysis(
      "sales.csv",
      "Revenue grew 10% in Q1.",
      ["Insight one.", "Insight two."]
    );
    expect(result).toContain("sales.csv");
    expect(result).toContain("Revenue grew 10% in Q1.");
    expect(result).toContain("Insight one.");
    expect(result).toContain("Insight two.");
  });

  it("follows the format: filename: summary insights", () => {
    const result = embeddingTextFromAnalysis("data.csv", "Summary.", ["A.", "B."]);
    expect(result).toBe("data.csv: Summary. A. B.");
  });

  it("handles an empty insights array", () => {
    const result = embeddingTextFromAnalysis("file.csv", "Summary.", []);
    expect(result).toBe("file.csv: Summary. ");
  });

  it("handles a single insight", () => {
    const result = embeddingTextFromAnalysis("f.csv", "S.", ["Only insight."]);
    expect(result).toBe("f.csv: S. Only insight.");
  });

  it("joins multiple insights with a space", () => {
    const result = embeddingTextFromAnalysis("f.csv", "S.", ["A.", "B.", "C."]);
    expect(result).toBe("f.csv: S. A. B. C.");
  });
});
