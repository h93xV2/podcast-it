import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, EpisodeInput, PodcastScript, Episode } from "../types";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

export class EpisodeCreate extends OpenAPIRoute {
    schema = {
        tags: ["Episodes"],
        summary: "Create a new Episode",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: EpisodeInput,
                    },
                },
            },
        },
        responses: {
            "200": {
                description: "Returns the created podcast",
                content: {
                    "application/json": {
                        schema: z.object({
                            series: z.object({
                                success: Bool(),
                                result: z.object({
                                    task: Episode,
                                }),
                            }),
                        }),
                    },
                },
            },
            "409": {
                description: "The podcast already exists",
                content: {
                    "application/json": {
                        schema: z.object({
                            series: z.object({
                                success: Bool(),
                                message: Str()
                            })
                        })
                    }
                }
            }
        },
    };

    async handle(c: AppContext) {
        const data = await this.getValidatedData<typeof this.schema>();
        const podcastToCreate = data.body;
        const uploadName = `${podcastToCreate.slug}.wav`;
        const insertStmt = c.env.DB.prepare('INSERT INTO Episodes (Slug) VALUES (?) ON CONFLICT(Slug) DO NOTHING');
        const insertResult = await insertStmt.bind(podcastToCreate.slug).run();

        if (!insertResult.meta.changed_db) {
            return new Response('Conflict: episode already exists', { status: 409 });
        }

        const client = new OpenAI({
            apiKey: c.env.OPENAI_API_KEY
        });
        const hostNameToVoice = new Map(podcastToCreate.hosts.map(host => [host.name.toLowerCase(), host.voice]));

        c.executionCtx.waitUntil(client.responses.parse({
            model: "gpt-4o-2024-08-06",
            input: [
                {
                    role: "system",
                    content: `
                        You are a helpful assistant that converts blog posts into podcast scripts.

                        Instructions:
                            - Read the provided blog post text carefully.
                            - Summarize and rephrase the content in a conversational tone suitable for spoken audio.
                            - Write the script as lines of dialogue between multiple hosts. You may create natural back-and-forth exchanges between them.
                            - Make the script engaging, clear, and natural for listening.
                            - Assign each line to a host using the names as provided.
                            - Do not include any other narration, instructions, or metadata beyond the dialogue itself.

                        Additional Guidance:
                            - Break the script into multiple short lines to improve pacing and variety.
                            - Paraphrase ideas rather than copying text verbatim.
                            - Distribute the dialogue naturally between the hosts.
                            - Preserve all important information, examples, and insights from the blog post.
                            - Do not add content that is not in the original text.
                            - The output must be valid JSON and must not include any explanation or extra text.
                            - Make sure the dialogue makes sense for the number of hosts. One host will speak differently than multiple hosts.
                    `
                },
                {
                    role: "user",
                    content: JSON.stringify({
                        content: podcastToCreate.content,
                        hosts: podcastToCreate.hosts,
                    }),
                },
            ],
            text: {
                format: zodTextFormat(PodcastScript, "script"),
            },
        }).then(async (response) => {
            const script = response.output_parsed;
            const audioBuffers = [];
            let firstHeader: Buffer | undefined = undefined;

            if (!script) {
                throw new Error("Script was not received from model");
            }

            for (let element of script.dialogue) {
                const ttsResponse = await client.audio.speech.create({
                    model: "gpt-4o-mini-tts",
                    voice: hostNameToVoice.get(element.hostName.toLowerCase()) || "alloy",
                    input: element.dialogue,
                    instructions: "Tone should be professional, relatable, and charismatic in line with a podcast host",
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

            // Combine header + data
            const finalWavBuffer = Buffer.concat([firstHeader, concatenatedData]);
            await c.env.podcasts.put(uploadName, finalWavBuffer);

            const updateStmt = c.env.DB.prepare('UPDATE Episodes SET Status = \'complete\', Transcript = ?, AudioFile = ? WHERE Slug = ?');
            await updateStmt.bind(JSON.stringify(script), uploadName, podcastToCreate.slug).run();
        }).catch((reason) => {
            console.error(reason);
        }));

        // TODO: Needs to also return uploadName as audioFile
        return {
            success: true,
            podcast: podcastToCreate,
        };
    }
}
