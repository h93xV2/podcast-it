import { writeFileSync, mkdirSync } from 'fs';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { PodcastScript } from '../src/types/types';

mkdirSync('evals/schemas', { recursive: true });

const schema = zodToJsonSchema(PodcastScript, 'PodcastScript');
writeFileSync(
  'evals/schemas/podcast-script.schema.json',
  JSON.stringify(schema, null, 2)
);