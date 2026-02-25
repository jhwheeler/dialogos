import OpenAI from "openai";
import type { SttProvider } from "./stt-provider.js";

export interface OpenAiSttConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
}

export class OpenAiStt implements SttProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  public constructor(config: OpenAiSttConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      ...(config.baseURL && { baseURL: config.baseURL }),
    });
    this.model = config.model ?? "whisper-1";
  }

  public async transcribe(audio: Buffer, mimeType: string): Promise<string> {
    const ext = mimeTypeToExtension(mimeType);
    const file = new File([new Uint8Array(audio)], `audio.${ext}`, { type: mimeType });

    const transcription = await this.client.audio.transcriptions.create({
      file,
      model: this.model,
    });

    return transcription.text;
  }
}

function mimeTypeToExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "audio/webm": "webm",
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/flac": "flac",
    "audio/x-m4a": "m4a",
    "audio/m4a": "m4a",
  };
  return map[mimeType] ?? "webm";
}
