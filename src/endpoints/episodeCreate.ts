import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, EpisodeInput, PodcastScript, Episode } from "../types/types";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import prompt from "./episodeCreatePrompt.txt";

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
      "202": {
        description: "Returns the details of requested podcast",
        content: {
          "application/json": {
            schema: z.object({
              series: z.object({
                success: Bool(),
                result: z.object({
                  episode: Episode,
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
                message: Str(),
              }),
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const podcastToCreate = data.body;
    const { hosts, slug, episodeTitle, showTitle, content } = podcastToCreate;
    const uploadName = `${slug}.wav`;
    const insertStmt = c.env.DB.prepare(
      "INSERT INTO Episodes (Slug, EpisodeTitle, ShowTitle) VALUES (?, ?, ?) ON CONFLICT(Slug) DO NOTHING",
    );
    const insertResult = await insertStmt.bind(slug, episodeTitle, showTitle).run();

    if (!insertResult.meta.changed_db) {
      return Response.json({message: "Conflict: the response already exists"}, {status: 409});
    }

    const client = new OpenAI({
      apiKey: c.env.OPENAI_API_KEY,
    });
    const hostNameToVoice = new Map(hosts.map((host) => [host.name.toLowerCase(), host.voice]));

    c.executionCtx.waitUntil(
      client.responses
        .parse({
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
        })
        .then(async (response) => {
          const script = response.output_parsed;
          const audioBuffers = [];
          let firstHeader: Buffer | undefined = undefined;

          if (!script) {
            throw new Error("Script was not received from model");
          }

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

          // Combine header + data
          const finalWavBuffer = Buffer.concat([firstHeader, concatenatedData]);
          await c.env.podcasts.put(uploadName, finalWavBuffer);

          const updateStmt = c.env.DB.prepare(
            "UPDATE Episodes SET Status = 'complete', Transcript = ?, AudioFile = ? WHERE Slug = ?",
          );
          await updateStmt.bind(JSON.stringify(script), uploadName, podcastToCreate.slug).run();
        })
        .catch(async (reason) => {
          console.error(reason);
          const errorStmt = c.env.DB.prepare("UPDATE Episodes SET Status = 'error' WHERE Slug = ?");
          await errorStmt.bind(slug).run();
        }),
    );

    // TODO: Needs to also return uploadName as audioFile
    return new Response(
      JSON.stringify({
        success: true,
        episode: { ...podcastToCreate, status: "pending" },
      }),
      {
        status: 202,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}
