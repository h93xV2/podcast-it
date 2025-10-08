import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, EpisodeInputSchema, Episode } from "../types/types";

export class EpisodeCreate extends OpenAPIRoute {
    schema = {
        tags: ["Episodes"],
        summary: "Create a new Episode",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: EpisodeInputSchema,
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

        c.env.episodes
            .send(podcastToCreate)
            .then(() => console.log("Episode request sent to queue"))
            .catch((error) => console.error(error));

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
