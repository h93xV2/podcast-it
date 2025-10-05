import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, Episode, EpisodeRecord } from "../types/types";

const Result = z.object({
    success: Bool(),
    episode: Episode,
});

export class EpisodeFetch extends OpenAPIRoute {
    schema = {
        tags: ["Episodes"],
        summary: "Get a single Episode by slug",
        request: {
            params: z.object({
                slug: Str({ description: "Episode slug" }),
            }),
        },
        responses: {
            "200": {
                description: "Returns a single episode if found",
                content: {
                    "application/json": {
                        schema: z.object({
                            series: Result,
                        }),
                    },
                },
            },
            "404": {
                description: "Episode not found",
                content: {
                    "application/json": {
                        schema: z.object({
                            series: z.object({
                                success: Bool(),
                                error: Str(),
                            }),
                        }),
                    },
                },
            },
        },
    };

    async handle(c: AppContext) {
        const data = await this.getValidatedData<typeof this.schema>();
        const { slug } = data.params;
        const selectStmt = c.env.DB.prepare("SELECT * FROM Episodes WHERE Slug = ?");
        const result = await selectStmt.bind(slug).run<EpisodeRecord>();

        if (result.results.length === 0) {
            return Response.json(
                {
                    success: false,
                    error: "Episode not found",
                },
                {
                    status: 404,
                },
            );
        }

        const episodeRecord = result.results[0];
        const responseBody: z.infer<typeof Result> = {
            success: true,
            episode: {
                slug: episodeRecord.Slug,
                audioFile: episodeRecord.AudioFile,
                status: episodeRecord.Status,
                transcript: episodeRecord.Transcript,
                episodeTitle: episodeRecord.EpisodeTitle,
                showTitle: episodeRecord.ShowTitle,
            },
        };

        return responseBody;
    }
}
