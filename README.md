# podcast-it

This is a Cloudflare Worker with OpenAPI 3.1 using [chanfana](https://github.com/cloudflare/chanfana) and [Hono](https://github.com/honojs/hono).

This project exposes a REST API for transforming text content into audio for podcast episodes.

## Get started

1. Sign up for [Cloudflare Workers](https://workers.dev). The free tier is more than enough for most use cases.
2. Clone this project and install dependencies with `npm install`.
3. Create a R2 bucket with `npx wrangler r2 bucket create podcasts`.
4. Create a D1 database with `npx wrangler@latest d1 create podcasts`.
5. Create database schema with `npx wrangler d1 execute podcasts --local --file=./schema.sql`.
6. Run `wrangler login` to login to your Cloudflare account in wrangler.
7. Run `wrangler deploy` to publish the API to Cloudflare Workers.

## Project structure

1. Your main router is defined in `src/index.ts`.
2. Each endpoint has its own file in `src/endpoints/`.
3. For more information read the [chanfana documentation](https://chanfana.pages.dev/) and [Hono documentation](https://hono.dev/docs).

## Development

1. Run `wrangler dev` to start a local instance of the API.
2. Open `http://localhost:8787/` in your browser to see the Swagger interface where you can try the endpoints.
3. Changes made in the `src/` folder will automatically trigger the server to reload, you only need to refresh the Swagger interface.
