import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../src/lib/socratic/system-prompt.js";
import { buildPromptContext } from "../src/lib/socratic/prompt-builder.js";

describe("Prompt discipline — system prompt builder", () => {
  it("includes BOOK PHASE section for closed_recall", () => {
    const prompt = buildSystemPrompt({
      triviumStage: "combined",
      topicTitle: "Test",
      bookPhase: "closed_recall",
    });

    expect(prompt).toContain("BOOK PHASE: Closed recall");
    expect(prompt).toContain("Do NOT reference or quote the source text");
  });

  it("includes BOOK PHASE section for open_text", () => {
    const prompt = buildSystemPrompt({
      triviumStage: "combined",
      topicTitle: "Test",
      bookPhase: "open_text",
    });

    expect(prompt).toContain("BOOK PHASE: Open text");
    expect(prompt).toContain("locate_passage");
  });

  it("includes BOOK PHASE section for final_compression", () => {
    const prompt = buildSystemPrompt({
      triviumStage: "combined",
      topicTitle: "Test",
      bookPhase: "final_compression",
    });

    expect(prompt).toContain("BOOK PHASE: Final compression");
    expect(prompt).toContain("concise, powerful restatement");
  });

  it("has no BOOK PHASE section when bookPhase is undefined", () => {
    const prompt = buildSystemPrompt({
      triviumStage: "combined",
      topicTitle: "Test",
    });

    expect(prompt).not.toContain("BOOK PHASE:");
  });

  it("includes citation friction text in source anchoring", () => {
    const prompt = buildSystemPrompt({
      triviumStage: "logic",
      topicTitle: "Republic",
      groundingTier: 1,
      sourceTitle: "The Republic",
      sourceExtractedText: "Some text here.",
    });

    expect(prompt).toContain("CITATION FRICTION");
    expect(prompt).toContain("demand the specific passage or page");
  });

  it("includes anti-lecture reinforcement in style constraints", () => {
    const prompt = buildSystemPrompt({
      triviumStage: "combined",
      topicTitle: "Test",
    });

    expect(prompt).toContain("NEVER lecture");
    expect(prompt).toContain("Convert to a question");
    expect(prompt).toContain("redirect: ask them to attempt it first");
  });

  it("includes audience guidance for rhetoric stage", () => {
    const prompt = buildSystemPrompt({
      triviumStage: "rhetoric",
      topicTitle: "Test",
    });

    expect(prompt).toContain("Who are you addressing?");
    expect(prompt).toContain("What objection would they raise?");
  });

  it("includes 'transition' in the prompt_type list in OUTPUT FORMAT", () => {
    const prompt = buildSystemPrompt({
      triviumStage: "combined",
      topicTitle: "Test",
    });

    expect(prompt).toContain("transition");
    expect(prompt).toContain("signaling a book phase change");
  });
});

describe("Prompt discipline — buildPromptContext", () => {
  it("suppresses source text during closed_recall", () => {
    const context = buildPromptContext({
      studentText: "I recall the author said something about justice.",
      triviumStage: "combined",
      topicTitle: "Republic",
      sourceTitle: "The Republic",
      sourceCitation: "Book I",
      sourceExtractedText: "Justice is the advantage of the stronger.",
      groundingTier: 1,
      bookPhase: "closed_recall",
      priorTurns: [],
    });

    // Source text should not appear in the system message
    expect(context.systemMessage).not.toContain("Justice is the advantage of the stronger.");
    expect(context.systemMessage).not.toContain("<source_text>");
    // But source title and citation should still be present
    expect(context.systemMessage).toContain("The Republic");
  });

  it("suppresses source text during final_compression", () => {
    const context = buildPromptContext({
      studentText: "My final argument is...",
      triviumStage: "combined",
      topicTitle: "Republic",
      sourceTitle: "The Republic",
      sourceCitation: "Book I",
      sourceExtractedText: "Justice is the advantage of the stronger.",
      groundingTier: 1,
      bookPhase: "final_compression",
      priorTurns: [],
    });

    expect(context.systemMessage).not.toContain("Justice is the advantage of the stronger.");
    expect(context.systemMessage).not.toContain("<source_text>");
  });

  it("includes source text during open_text", () => {
    const context = buildPromptContext({
      studentText: "Looking at the text...",
      triviumStage: "combined",
      topicTitle: "Republic",
      sourceTitle: "The Republic",
      sourceCitation: "Book I",
      sourceExtractedText: "Justice is the advantage of the stronger.",
      groundingTier: 1,
      bookPhase: "open_text",
      priorTurns: [],
    });

    expect(context.systemMessage).toContain("Justice is the advantage of the stronger.");
    expect(context.systemMessage).toContain("<source_text>");
  });
});
