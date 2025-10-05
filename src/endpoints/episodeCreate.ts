import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, EpisodeInput, Episode } from "../types/types";
import OpenAI from "openai";
import prompt from "./episodeCreatePrompt.txt";
import createEpisode from "../services/create-episode";

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
        const { slug, episodeTitle, showTitle } = podcastToCreate;
        
        const insertStmt = c.env.DB.prepare(
            "INSERT INTO Episodes (Slug, EpisodeTitle, ShowTitle) VALUES (?, ?, ?) ON CONFLICT(Slug) DO NOTHING",
        );
        const insertResult = await insertStmt.bind(slug, episodeTitle, showTitle).run();

        if (!insertResult.meta.changed_db) {
            return Response.json({ message: "Conflict: episode already exists" }, { status: 409 });
        }

        const client = new OpenAI({
            apiKey: c.env.OPENAI_API_KEY,
        });
        
        c.executionCtx.waitUntil(
            createEpisode(c, client, prompt, podcastToCreate)
        );

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
