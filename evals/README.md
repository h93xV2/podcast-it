# Evals

To get started, set your OPENAI_API_KEY environment variable, or other required keys for the providers you selected.

For convenience, the `OPENAI_API_KEY` will be copied from `.dev.vars` when running `npm run evals` from the root of the project. Otherwise, it needs to be set manually.

Next, edit promptfooconfig.yaml.

Then run:
```
promptfoo eval
```

Afterwards, you can view the results by running `promptfoo view`

## Test Data Attribution

Some of the eval test data was scraped from my own website https://logarithmicspirals.com/ using the [Convert HTML to TEXT](https://totheweb.com/learning_center/tools-convert-html-text-to-plain-text-for-content-review/) tool.