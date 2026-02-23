/**
 * Strip control characters (except newlines and tabs) from text.
 * Used to sanitize student transcriptions and source extracted text
 * before including them in the LLM prompt (TECH_SPEC Section 6.4.4).
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export function stripControlCharacters(text: string): string {
  return text.replace(CONTROL_CHARS, "");
}

/**
 * Wrap student speech in delimiter tags for prompt injection isolation.
 * The system prompt instructs the model to treat content inside these
 * delimiters as student speech only (TECH_SPEC Section 6.4.4).
 */
export function wrapStudentSpeech(text: string): string {
  const sanitized = stripControlCharacters(text);
  return `<student_speech>${sanitized}</student_speech>`;
}

/**
 * Sanitize source extracted text before including in prompt context.
 * Strips non-printable characters and wraps in clear delimiters.
 */
export function wrapSourceText(text: string): string {
  const sanitized = stripControlCharacters(text);
  return `<source_text>${sanitized}</source_text>`;
}
