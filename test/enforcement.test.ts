import { describe, it, expect } from "vitest";
import {
  validateOutput,
  validateEnumsForPersistence,
  countWords,
  countSentences,
  containsBannedPhrase,
} from "../src/lib/prompt/enforcement.js";
import type { SocraticOutput } from "../src/lib/llm/llm-provider.js";

function validOutput(overrides: Partial<SocraticOutput> = {}): SocraticOutput {
  return {
    next_prompt: "Define justice in one sentence.",
    prompt_type: "define",
    detected_issue: "vague_term",
    stop_reason: "needs_definition",
    ...overrides,
  };
}

describe("countWords", () => {
  it("counts words correctly", () => {
    expect(countWords("Define justice.")).toBe(2);
    expect(countWords("What is the meaning of cause?")).toBe(6);
    expect(countWords("  spaced  out  words  ")).toBe(3);
    expect(countWords("")).toBe(0);
    expect(countWords("one")).toBe(1);
  });
});

describe("countSentences", () => {
  it("counts single sentence", () => {
    expect(countSentences("Define justice.")).toBe(1);
  });

  it("counts multiple sentences", () => {
    expect(countSentences("Define justice. Then explain it.")).toBe(2);
  });

  it("handles question marks", () => {
    expect(countSentences("What is justice?")).toBe(1);
  });

  it("handles exclamation marks", () => {
    expect(countSentences("Define it!")).toBe(1);
  });

  it("handles text without punctuation as one sentence", () => {
    expect(countSentences("Define justice")).toBe(1);
  });

  it("handles empty string", () => {
    expect(countSentences("")).toBe(0);
  });
});

describe("containsBannedPhrase", () => {
  it("returns null for clean text", () => {
    expect(containsBannedPhrase("Define justice.")).toBeNull();
  });

  it("detects praise words", () => {
    expect(containsBannedPhrase("Great job defining that!")).toBe("Great");
    expect(containsBannedPhrase("That's a perfect answer.")).toBe("perfect");
    expect(containsBannedPhrase("Awesome work.")).toBe("Awesome");
  });

  it("is case-insensitive", () => {
    expect(containsBannedPhrase("EXCELLENT point.")).toBe("EXCELLENT");
  });

  it("matches whole words only", () => {
    expect(containsBannedPhrase("They have a good love of wisdom.")).toBe("love");
    // "goods" should not match "good" — it's a different word
    expect(containsBannedPhrase("Discuss material goods.")).toBeNull();
  });
});

describe("validateOutput", () => {
  it("accepts a valid output", () => {
    expect(validateOutput(validOutput())).toBeNull();
  });

  it("rejects when next_prompt exceeds word cap", () => {
    const output = validOutput({
      next_prompt: "This is a very long prompt that exceeds the twelve word limit set by the system rules.",
    });
    const violation = validateOutput(output);
    expect(violation).not.toBeNull();
    expect(violation!.rule).toBe("word_cap");
  });

  it("accepts output within custom word cap", () => {
    const output = validOutput({
      next_prompt: "What exactly do you mean by that particular term here?",
    });
    // 10 words — should fail default 12 word cap? No, 10 <= 12
    expect(validateOutput(output)).toBeNull();
    // But should pass 16 word cap
    expect(validateOutput(output, 16)).toBeNull();
  });

  it("rejects banned phrases", () => {
    const output = validOutput({ next_prompt: "Great, now define justice." });
    const violation = validateOutput(output);
    expect(violation).not.toBeNull();
    expect(violation!.rule).toBe("banned_phrase");
  });

  it("rejects multiple sentences", () => {
    const output = validOutput({ next_prompt: "Define justice. Be precise." });
    const violation = validateOutput(output);
    expect(violation).not.toBeNull();
    expect(violation!.rule).toBe("sentence_count");
  });

  it("rejects invalid prompt_type enum", () => {
    const output = { ...validOutput(), prompt_type: "invalid_type" };
    const violation = validateOutput(output as unknown as SocraticOutput);
    expect(violation).not.toBeNull();
    expect(violation!.rule).toBe("schema");
  });

  it("rejects invalid detected_issue enum", () => {
    const output = { ...validOutput(), detected_issue: "not_a_real_issue" };
    const violation = validateOutput(output as unknown as SocraticOutput);
    expect(violation).not.toBeNull();
    expect(violation!.rule).toBe("schema");
  });
});

describe("validateEnumsForPersistence", () => {
  it("accepts valid enums", () => {
    expect(validateEnumsForPersistence("define", "vague_term")).toBe(true);
    expect(validateEnumsForPersistence("locate_passage", "unsupported_by_source")).toBe(true);
    expect(validateEnumsForPersistence("scaffold", "content_request")).toBe(true);
    expect(validateEnumsForPersistence("clarify", "none")).toBe(true);
  });

  it("rejects invalid prompt type", () => {
    expect(validateEnumsForPersistence("invalid_type", "none")).toBe(false);
  });

  it("rejects invalid detected issue", () => {
    expect(validateEnumsForPersistence("define", "invalid_issue")).toBe(false);
  });
});
