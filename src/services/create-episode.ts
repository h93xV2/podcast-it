import OpenAI from "openai";
import { AppContext, EpisodeInput, PodcastScript } from "../types/types";
import z from "zod";
import { zodTextFormat } from "openai/helpers/zod";

const createEpisode = async (
    c: AppContext,
    client: OpenAI,
    prompt: string,
    episodeInput: z.infer<typeof EpisodeInput>,
) => {
    const { content, hosts, showTitle, slug } = episodeInput;

    try {
        const response = await client.responses.parse({
            model: "gpt-4o-2024-08-06",
            input: [
                {
                    role: "system",
                    content: prompt,
                },
                {
                    role: "user",
                    content: JSON.stringify({
                        content: content,
                        hosts: hosts,
                        showTitle,
                    }),
                },
            ],
            text: {
                format: zodTextFormat(PodcastScript, "script"),
            },
        });

        const script = response.output_parsed;
        const audioBuffers = [];
        let firstHeader: Buffer | undefined = undefined;

        if (!script) {
            throw new Error("Script was not received from model");
        }

        const hostNameToVoice = new Map(hosts.map((host) => [host.name.toLowerCase(), host.voice]));

        for (const element of script.dialogue) {
            const ttsResponse = await client.audio.speech.create({
                model: "gpt-4o-mini-tts",
                voice: hostNameToVoice.get(element.hostName.toLowerCase()) || "alloy",
                input: element.dialogue,
                instructions:
                    "Tone should be professional, relatable, and charismatic in line with a podcast host",
                response_format: "wav",
            });
            const audioClip = Buffer.from(await ttsResponse.arrayBuffer());
            const header = audioClip.subarray(0, 44);
            const data = audioClip.subarray(44);

            if (!firstHeader) {
                firstHeader = Buffer.from(header); // Clone so we can modify it
            }

            audioBuffers.push(data);
        }

        if (!firstHeader) {
            throw new Error("No header found from first audio sample");
        }

        const totalDataLength = audioBuffers.reduce((sum, d) => sum + d.length, 0);
        const concatenatedData = Buffer.concat(audioBuffers);

        // Update ChunkSize (file size - 8 bytes)
        const chunkSize = 36 + totalDataLength;
        firstHeader.writeUInt32LE(chunkSize, 4); // ChunkSize field (bytes 4–7)

        // Update Subchunk2Size (data section size)
        firstHeader.writeUInt32LE(totalDataLength, 40); // Subchunk2Size field (bytes 40–43)

        const uploadName = `${slug}.wav`;

        // Combine header + data
        const finalWavBuffer = Buffer.concat([firstHeader, concatenatedData]);
        await c.env.podcasts.put(uploadName, finalWavBuffer);

        const updateStmt = c.env.DB.prepare(
            "UPDATE Episodes SET Status = 'complete', Transcript = ?, AudioFile = ? WHERE Slug = ?",
        );
        await updateStmt.bind(JSON.stringify(script), uploadName, slug).run();
    } catch (reason) {
        console.error(reason);
        const errorStmt = c.env.DB.prepare("UPDATE Episodes SET Status = 'error' WHERE Slug = ?");
        await errorStmt.bind(slug).run();
    }
};

export default createEpisode;
