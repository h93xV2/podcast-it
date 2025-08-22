import { mkdirSync, writeFileSync } from 'node:fs';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { PodcastScript } from '../src/types/types';

mkdirSync('evals/schemas', { recursive: true });

const inner = zodToJsonSchema(PodcastScript, {
  target: 'openAi'
});

if (inner.$schema) delete inner.$schema;

const responseFormat = {
  type: 'json_schema',
  name: 'podcast_script',
  schema: inner
};

// Write the wrapped file
writeFileSync(
  'evals/schemas/podcast-script.response_format.json',
  JSON.stringify(responseFormat, null, 2)
);

writeFileSync(
  'evals/schemas/podcast-script.expected_format.json',    // <- for tests
  JSON.stringify(inner, null, 2)
);