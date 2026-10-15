# microrena

**Benchmark streaming LLM completions from the command line.**

`microrena` is a lightweight Node.js CLI for benchmarking streaming language model completions across configurable API sources. Measure response speed, time to first token, throughput, token usage, and estimated cost — all from your terminal.

## Features

- **Time to first token (TTFT)** — measure how long it takes for the first token to arrive.
- **Latency & throughput** — track total response time and effective tokens per second.
- **Token statistics** — inspect prompt, completion, reasoning, and total token usage when available.
- **Cost tracking** — view estimated completion costs when pricing information is configured or available.
- **Multiple sources** — add, list, and remove configured model/API sources.
- **Streaming-first** — benchmark streamed completions instead of measuring only the final response.
- **Terminal output** — readable CLI results with formatted output.

## Installation

Install globally using npm:

```bash
npm install -g microrena
```

Or run it without a global installation:

```bash
npx microrena run "Explain how neural networks learn."
```

## Usage

### Run a benchmark

```bash
microrena run "Explain how neural networks learn."
```

This runs a streaming completion using your configured sources and reports the available performance metrics.

### Manage sources

Add a source:

```bash
microrena add
```

List configured sources:

```bash
microrena list
```

Remove a source:

```bash
microrena remove <source>
```

Use `microrena add` to configure a source before running benchmarks.

## Metrics

Depending on the provider and the metadata it returns, `microrena` tracks:

| Metric | Description |
| --- | --- |
| TTFT | Time until the first generated token |
| Total latency | Time taken to complete the response |
| Tokens/sec | Effective generation throughput |
| Prompt tokens | Tokens consumed by the input |
| Completion tokens | Tokens generated in the response |
| Reasoning tokens | Reasoning-token usage, when reported |
| Total tokens | Total reported token usage |
| Estimated cost | Estimated cost when pricing data is available |

**Note:** Metrics depend on the source provider. Token counts, reasoning usage, and cost may not be available for every API.

## Configuration

`microrena` stores source configuration in:

```text
~/.config/microrena/sources.json
```

API credentials should be supplied through environment variables. Source configurations store environment-variable names rather than the secret values themselves.

For example, if a configured source references `MY_API_KEY`, set the variable in your shell:

```bash
export MY_API_KEY="your-api-key"
```

Avoid committing API keys or other credentials to version control.

## Development

Clone the repository:

```bash
git clone https://github.com/neevjewalkar/microrena.git
cd microrena
npm install
```

Run the CLI locally:

```bash
node index.js run "Test streaming performance."
```

The project uses native JavaScript ES modules.

## Why microrena?

A model's name and advertised speed don't tell the whole story. Time to first token, generation throughput, provider overhead, and token usage all affect the experience of using an LLM.

`microrena` gives you a way to measure those characteristics from the command line.

## Contributing

Issues, bug reports, and pull requests are welcome!

If you find a bug or want to propose a feature, open an issue in the GitHub repository.
