export type Episode = {
    status: string;
    slug: string;
    audioFile: string;
    transcript: string;
    episodeTitle: string;
    showTitle: string;
};

export type EpisodeListResult = {
    success: boolean;
    episodes: Episode[];
};

export type EpisodeFetchResult = {
    success: boolean;
    episode: Episode;
};