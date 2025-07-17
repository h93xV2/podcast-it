import { fromHono } from "chanfana";
import { Hono } from "hono";
import { EpisodeCreate } from "./endpoints/episodeCreate";
import { EpisodeDelete } from "./endpoints/episodeDelete";
import { EpisodeFetch } from "./endpoints/episodeFetch";
import { EpisodeList } from "./endpoints/episodeList";
import { AudioFetch } from "./endpoints/audioFetch";
import { EpisodesDelete } from "./endpoints/episodesDelete";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

// Setup OpenAPI registry
const openapi = fromHono(app, {
	docs_url: "/",
});

// Register OpenAPI endpoints
openapi.get("/api/episodes", EpisodeList);
openapi.post("/api/episodes", EpisodeCreate);
openapi.get("/api/episodes/:slug", EpisodeFetch);
openapi.delete("/api/episodes/:slug", EpisodeDelete);
openapi.delete("/api/episodes", EpisodesDelete);
openapi.get("/api/audio/:file", AudioFetch);

// You may also register routes for non OpenAPI directly on Hono
// app.get('/test', (c) => c.text('Hono!'))

// Export the Hono app
export default app;
