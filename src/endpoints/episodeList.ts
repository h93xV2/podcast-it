import { Bool, Num, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, Episode, EpisodeRecord } from "../types";

const Result = z.object({
    success: Bool(),
    episodes: Episode.array()
});

export class EpisodeList extends OpenAPIRoute {
    schema = {
        tags: ["Episodes"],
        summary: "List Episodes",
        request: {
            query: z.object({
                page: Num({
                    description: "Page number",
                    default: 1,
                    example: 1
                }),
                pageSize: Num({
                    description: "Number of results per page",
                    default: 10,
                    example: 10
                }),
                status: Str({ description: "Status to search by", required: false })
            }),
        },
        responses: {
            "200": {
                description: "Returns a list of episodes",
                content: {
                    "application/json": {
                        schema: z.object({
                            series: Result,
                        }),
                    },
                },
            },
        },
    };

    async handle(c: AppContext) {
        const data = await this.getValidatedData<typeof this.schema>();
        const { page, pageSize, status } = data.query;

        if (page < 1 || pageSize < 1) {
            return Response.json({
                success: false,
                error: "Page and page size cannot be less than 1",
            }, {
                status: 400
            });
        }

        const query = `
            SELECT *
            FROM Episodes${status ? ' WHERE Status = ?' : '' }
            ORDER BY Id
            LIMIT ?
            OFFSET ?
        `;
        const selectStmt = c.env.DB.prepare(query);
        const parameters = [pageSize.toString(), ((page - 1) * pageSize).toString()];

        if (status) {
            parameters.unshift(status);
        }

        const result = await selectStmt.bind(...parameters).run<EpisodeRecord>();

        const responseBody: z.infer<typeof Result> = {
            success: true,
            episodes: result.results.map(row => {
                return {
                    status: row.Status,
                    slug: row.Slug,
                    audioFile: row.AudioFile,
                    transcript: row.Transcript
                };
            }),
        };

        return responseBody;
    }
}
