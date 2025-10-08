import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { AppContext } from "../types/types";

export class AudioFetch extends OpenAPIRoute {
    schema = {
        tags: ["Audio"],
        summary: "Get a single audio file by name",
        request: {
            params: z.object({
                file: Str({ description: "Name of the file" }),
            }),
        },
        responses: {
            "200": {
                description: "Returns a single audio file if found",
                content: {
                    "audio/mpeg": {
                        schema: z.object({
                            type: z.literal("string"),
                            format: z.literal("binary"),
                        }),
                    },
                },
            },
            "404": {
                description: "Audio not found.",
                content: {
                    "application/json": {
                        schema: z.object({
                            series: Bool(),
                            error: Str(),
                        }),
                    },
                },
            },
        },
    };

    async handle(c: AppContext) {
        const data = await this.getValidatedData<typeof this.schema>();
        const { file } = data.params;

        const audio = await c.env.podcasts.get(file);

        if (!audio) {
            return Response.json(
                {
                    success: false,
                    error: "Audio not found",
                },
                {
                    status: 404,
                },
            );
        }

        return new Response(audio.body, {
            status: 200,
            headers: { "Content-Type": "audio/wav" },
        });
    }
}
