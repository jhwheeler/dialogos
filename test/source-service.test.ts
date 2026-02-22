import { describe, it, expect } from "vitest";
import { SourceService } from "../src/services/source/source.service.js";

describe("SourceService.deriveGroundingTier", () => {
  it("returns Tier 1 for document with extracted text", () => {
    expect(SourceService.deriveGroundingTier("document", "Some extracted content")).toBe(1);
  });

  it("returns Tier 1 for photo_ocr with extracted text", () => {
    expect(SourceService.deriveGroundingTier("photo_ocr", "OCR content")).toBe(1);
  });

  it("returns Tier 1 for reference with extracted text", () => {
    expect(SourceService.deriveGroundingTier("reference", "Full text of reference")).toBe(1);
  });

  it("returns Tier 1 for voice_summary with extracted text", () => {
    expect(SourceService.deriveGroundingTier("voice_summary", "Transcribed summary")).toBe(1);
  });

  it("returns Tier 2 for reference without text", () => {
    expect(SourceService.deriveGroundingTier("reference")).toBe(2);
    expect(SourceService.deriveGroundingTier("reference", undefined)).toBe(2);
  });

  it("returns Tier 3 for document without extracted text", () => {
    expect(SourceService.deriveGroundingTier("document")).toBe(3);
    expect(SourceService.deriveGroundingTier("document", undefined)).toBe(3);
  });

  it("returns Tier 3 for photo_ocr without extracted text", () => {
    expect(SourceService.deriveGroundingTier("photo_ocr")).toBe(3);
  });

  it("returns Tier 3 for voice_summary without text", () => {
    expect(SourceService.deriveGroundingTier("voice_summary")).toBe(3);
  });

  it("returns Tier 3 when extracted text is empty string", () => {
    expect(SourceService.deriveGroundingTier("document", "")).toBe(3);
  });

  it("returns Tier 3 when extracted text is whitespace only", () => {
    expect(SourceService.deriveGroundingTier("document", "   ")).toBe(3);
  });
});
