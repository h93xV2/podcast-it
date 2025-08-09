# podcast-it

This is a Cloudflare Worker with OpenAPI 3.1 using [chanfana](https://github.com/cloudflare/chanfana) and [Hono](https://github.com/honojs/hono).

This project exposes a REST API for transforming text content into audio for podcast episodes.

## Get started

1. Sign up for [Cloudflare Workers](https://workers.dev). The free tier is more than enough for most use cases.
2. Clone this project and install dependencies with `npm install`.
3. Create a R2 bucket with `npx wrangler r2 bucket create podcasts`.
4. Create a D1 database with `npx wrangler@latest d1 create podcasts`.
5. Run `wrangler login` to login to your Cloudflare account in wrangler.
6. Run `wrangler deploy` to publish the API to Cloudflare Workers.

## Project structure

1. Your main router is defined in `src/index.ts`.
2. Each endpoint has its own file in `src/endpoints/`.
3. For more information read the [chanfana documentation](https://chanfana.pages.dev/) and [Hono documentation](https://hono.dev/docs).

## Development

1. Run `npm start` to start a local instance of the API.
2. Open `http://localhost:8787/` in your browser to see the Swagger interface where you can try the endpoints.
3. Changes made in the `src/` folder will automatically trigger the server to reload, you only need to refresh the Swagger interface.

## Securing the Deployments

For a secure deployment, the following steps should suffice:
1. Set up Cloudflare Zero Trust.
2. Create an application for the dev worker URL.
3. Create a service token.
4. Create a policy which only accepts the service token.
5. Assign the policy to the application.
6. Deploy the application.

## Testing

Run tests with `npm run test`.

Caveats:
- Currently, vitest watch mode is broken with D1 https://github.com/cloudflare/workers-sdk/issues/9913.
- Vitest `__mocks__` do not work https://github.com/cloudflare/workers-sdk/issues/7679.