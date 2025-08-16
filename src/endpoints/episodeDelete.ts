import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext, Episode } from "../types";

const Result = z.object({
    success: Bool(),
    episode: Episode,
});

type DeleteRow = {
    AudioFile: string;
    Title: string;
    Description: string;
    Transcript: string;
};

export class EpisodeDelete extends OpenAPIRoute {
    schema = {
        tags: ["Episodes"],
        summary: "Delete an Episode",
        request: {
            params: z.object({
                slug: Str({ description: "Episode slug" }),
            }),
        },
        responses: {
            "200": {
                description: "Returns if the episode was deleted successfully",
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
        // Get validated data
        const data = await this.getValidatedData<typeof this.schema>();

        // Retrieve the validated slug
        const { slug } = data.params;

        // Implement your own object deletion here
        const deleteStmt = c.env.DB.prepare('DELETE FROM Episodes WHERE Slug = ? RETURNING AudioFile, Transcript');
        const deleteResult = await deleteStmt.bind(slug).run<DeleteRow>();
        const deletedRow = deleteResult.results[0];

        if (!deletedRow) {
            return Response.json({
                success: false,
                error: 'Episode not found for deletion'
            }, {
                status: 404
            });
        }

        const audioFile = deletedRow.AudioFile;

        await c.env.podcasts.delete(audioFile);

        // Return the deleted task for confirmation
        const result: z.infer<typeof Result> = {
            episode: {
                slug,
                status: 'deleted',
                audioFile,
                transcript: deletedRow.Transcript
            },
            success: true
        }

        return result;
    }
}
