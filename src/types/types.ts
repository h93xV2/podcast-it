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
    slug: Str({ required: true }),
    content: Str({ required: true }),
    hosts: z.array(Host),
    episodeTitle: Str({ required: true }),
    showTitle: Str({ required: true })
});

export const Episode = EpisodeInput
    .omit({ content: true, hosts: true })
    .extend({
        audioFile: Str({ required: true }),
        status: Str({ required: true }),
        transcript: Str()
    });

export type EpisodeRecord = {
    Slug: string;
    AudioFile: string;
    Status: string;
    Transcript: string;
    EpisodeTitle: string;
    ShowTitle: string;
};

export const PodcastScript = z.object({
    dialogue: z.array(
        z.object({
            hostName: Str(),
            dialogue: Str()
        })
    )
});