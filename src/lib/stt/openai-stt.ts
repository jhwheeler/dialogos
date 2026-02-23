import type { SttProvider, SttResult } from "./stt-provider.js";

/** Map MIME types to file extensions that OpenAI Whisper accepts. */
const MIME_TO_EXT: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/aac": "aac",
  "audio/flac": "flac",
};

export class OpenAiStt implements SttProvider {
  private readonly apiKey: string;
  private readonly model: string;

  public constructor(options: { apiKey: string; model?: string }) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? "whisper-1";
  }

  public async transcribe(audio: Buffer, mimeType: string): Promise<SttResult> {
    const ext = MIME_TO_EXT[mimeType] ?? "webm";
    const filename = `audio.${ext}`;

    const form = new FormData();
    // Copy into a fresh ArrayBuffer to satisfy the Blob constructor's type constraint
    const arrayBuffer = audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer;
    form.append("file", new Blob([arrayBuffer], { type: mimeType }), filename);
    form.append("model", this.model);

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: form,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI STT request failed (${response.status}): ${body}`);
    }

    const result = (await response.json()) as { text: string };
    return { text: result.text };
  }
}
