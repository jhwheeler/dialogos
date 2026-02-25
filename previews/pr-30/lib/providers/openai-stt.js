import OpenAI from "openai";
export class OpenAiStt {
    client;
    model;
    constructor(config) {
        this.client = new OpenAI({
            apiKey: config.apiKey,
            ...(config.baseURL && { baseURL: config.baseURL }),
        });
        this.model = config.model ?? "whisper-1";
    }
    async transcribe(audio, mimeType) {
        const ext = mimeTypeToExtension(mimeType);
        const file = new File([new Uint8Array(audio)], `audio.${ext}`, { type: mimeType });
        const transcription = await this.client.audio.transcriptions.create({
            file,
            model: this.model,
        });
        return transcription.text;
    }
}
function mimeTypeToExtension(mimeType) {
    const map = {
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
