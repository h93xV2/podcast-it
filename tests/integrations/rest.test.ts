import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    env,
} from "cloudflare:test";
import { Episode, EpisodeFetchResult, EpisodeListResult } from "../types";
import { call } from "../utils";

const responsesParse = vi.fn();
const audioCreate = vi.fn();

vi.mock("openai", () => {
    class OpenAI {
        constructor(_: any) { }
        get responses() {
            return { parse: responsesParse };
        }
        get audio() {
            return { speech: { create: audioCreate } };
        }
    }
    return { default: OpenAI };
});

describe("Basic worker test", () => {
    it("responds with 404 status code", async () => {
        const response = await call(env, "GET", "http://example.com/404")

        expect(response.status).toBe(404);
        expect(await response.text()).toBe("404 Not Found");
    });
});

describe("Get episodes list", () => {
    beforeEach(async () => {
        await env.DB.prepare("DELETE FROM Episodes;").run();
    });

    it("responds with empty list", async () => {
        const response = await call(env, "GET", "http://example.com/api/episodes");
        const status = response.status;
        const result: EpisodeListResult = await response.json();

        expect(status).toBe(200);
        expect(result.episodes.length).toBe(0);
    });

    it("responds with a list of one episode", async () => {
        const status = "complete";
        const slug = "hello-world";
        const audioFile = "hello-world.mp3";
        const transcript = "Hello world";

        await env.DB
            .prepare(
                `INSERT INTO Episodes (status, slug, audioFile, transcript)
                VALUES (?1, ?2, ?3, ?4)`
            )
            .bind(status, slug, audioFile, transcript)
            .run();

        const response = await call(env, "GET", "http://example.com/api/episodes")
        const result: EpisodeListResult = await response.json();
        const statusCode = response.status;

        expect(statusCode).toBe(200);
        expect(result.episodes.length).toBe(1);

        const episode = result.episodes[0];

        expect(episode.audioFile).toEqual(audioFile);
        expect(episode.slug).toEqual(slug);
        expect(episode.status).toEqual(status);
        expect(episode.transcript).toEqual(transcript);
    });
});

describe("Episode creation", () => {
    it("creates a podcast episode", async () => {
        const testAudio = new Uint8Array(64);

        responsesParse.mockResolvedValue({
            output_parsed: {
                dialogue: [
                    { hostName: "Test Host", dialogue: "Hello" },
                ]
            }
        });
        audioCreate.mockResolvedValue({
            arrayBuffer: async () => testAudio.buffer
        });

        const testSlug = "test";
        const podcastToCreate = {
            slug: testSlug,
            content: "This is a simple test",
            hosts: [{
                "name": "Test Host",
                "voice": "alloy"
            }]
        };
        const createResponse = await call(env, "POST", "http://example.com/api/episodes", podcastToCreate);
        const createStatusCode = createResponse.status;

        expect(createStatusCode).toBe(200);

        const getResponse = await call(env, "GET", `http://example.com/api/episodes/${testSlug}`);
        const getStatusCode = getResponse.status;
        const getResult: EpisodeFetchResult = await getResponse.json();
        const episode: Episode = getResult.episode;

        expect(getStatusCode).toBe(200);
        expect(episode.slug).toBe(testSlug);
        expect(episode.status).toBe("complete");
        expect(episode.audioFile).toBe(`${testSlug}.wav`);

        const audioResponse = await call(env, "GET", `http://example.com/api/audio/${episode.audioFile}`);
        const audio = Buffer.from(await audioResponse.arrayBuffer());

        expect(audioResponse.status).toBe(200);
        expect(audio.byteLength).toBe(testAudio.byteLength);
        expect([...audio.subarray(0, 4)]).toEqual([...testAudio.subarray(0, 4)]);
    });

    it("cannot create an episode that already exists", async () => {
        responsesParse.mockResolvedValue({
            output_parsed: {
                dialogue: [
                    { hostName: "Test Host", dialogue: "Hello" },
                ]
            }
        });
        audioCreate.mockResolvedValue({
            arrayBuffer: async () => new Uint8Array(64).buffer
        });

        const podcastToCreate = {
            slug: "test",
            content: "This is a simple test",
            hosts: [{
                "name": "Test Host",
                "voice": "alloy"
            }]
        };

        const firstCreateResponse = await call(env, "POST", "http://example.com/api/episodes", podcastToCreate);

        expect(firstCreateResponse.status).toBe(200);

        const secondCreateResponse = await call(env, "POST", "http://example.com/api/episodes", podcastToCreate);

        expect(secondCreateResponse.status).toBe(409);
        expect(await secondCreateResponse.text()).toBe('Conflict: episode already exists');
    });

    // TODO: Add a new status "error" to the database.
});