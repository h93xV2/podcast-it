import { OpenAPIRoute } from "chanfana";
import { AppContext } from "../types";

export class EpisodesDelete extends OpenAPIRoute {
    schema = {
        tags: ["Episodes"],
        summary: "Delete all Episodes",
        responses: {
            "204": {
                description: "The deletion was sucessful"
            }
        }
    };

    async handle(c: AppContext) {
        const stmt = c.env.DB.prepare("DELETE FROM Episodes");
        await stmt.run();

        return new Response(null, { status: 204 });
    }
}