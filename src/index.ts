import { fromHono } from "chanfana";
import { Hono } from "hono";
import { EpisodeCreate } from "./endpoints/episodeCreate";
import { EpisodeDelete } from "./endpoints/episodeDelete";
import { EpisodeFetch } from "./endpoints/episodeFetch";
import { EpisodeList } from "./endpoints/episodeList";
import { AudioFetch } from "./endpoints/audioFetch";
import { EpisodesDelete } from "./endpoints/episodesDelete";
import { EpisodeInput } from "./types/types";
import createEpisode from "./services/create-episode";
import OpenAI from "openai";

const app = new Hono<{ Bindings: Env }>();

const openapi = fromHono(app, {
    docs_url: "/",
});

openapi.get("/api/episodes", EpisodeList);
openapi.post("/api/episodes", EpisodeCreate);
openapi.get("/api/episodes/:slug", EpisodeFetch);
openapi.delete("/api/episodes/:slug", EpisodeDelete);
openapi.delete("/api/episodes", EpisodesDelete);
openapi.get("/api/audio/:file", AudioFetch);

export default {
    fetch: app.fetch,
    async queue(batch: MessageBatch<EpisodeInput>, env: Env) {
        const client = new OpenAI({
            apiKey: env.OPENAI_API_KEY
        });
        
        for (const message of batch.messages) {
            await createEpisode(env.DB, env.podcasts, client, message.body);
        }
    },
};
