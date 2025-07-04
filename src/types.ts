import { Str } from "chanfana";
import type { Context } from "hono";
import { z } from "zod";

export type AppContext = Context<{ Bindings: Env }>;

export const Host = z.object({
    name: Str({ required: true }),
    voice: z.enum([
        "alloy",
        "ash",
        "ballad",
        "coral",
        "echo",
        "fable",
        "nova",
        "onyx",
        "sage",
        "shimmer",
        "verse"
    ])
});

export const EpisodeInput = z.object({
    title: Str({ example: "Hello world", required: true }),
    slug: Str({ required: true }),
    description: Str({ required: true }),
    content: Str({ required: true }),
    hosts: z.array(Host)
});

export const Episode = EpisodeInput
    .omit({ content: true, hosts: true })
    .extend({
        audioFile: Str({ required: true }),
        status: Str({ required: true }),
        transcript: Str()
    });

export type EpisodeRecord = {
    Title: string;
    Slug: string;
    Description: string;
    AudioFile: string;
    Status: string;
    Transcript?: string;
};

export const PodcastScript = z.object({
    dialogue: z.array(
        z.object({
            hostName: Str(),
            dialogue: Str()
        })
    )
});