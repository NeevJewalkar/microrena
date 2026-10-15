#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import boxen from 'boxen';
import { generateStreamingCompletion } from './apiHelper.js';

const configPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'sources.json'
);

const loadSources = () => {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    if (!Array.isArray(data.sources)) {
        throw new Error('sources.json must contain a "sources" array.');
    }

    return data.sources;
};

const saveSources = (sources) => {
    fs.writeFileSync(
        configPath,
        JSON.stringify({ sources }, null, 2) + '\n',
        'utf8'
    );
};

const getApiKey = (source) => {
    if (source.apiKeyEnv) {
        return process.env[source.apiKeyEnv];
    }

    return source.apiKey;
};

const addSource = async () => {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    try {
        const sourceName = (await rl.question('Source name: ')).trim();
        const baseUrl = (await rl.question('API base URL: ')).trim();
        const modelID = (await rl.question('Model ID: ')).trim();
        const apiKeyEnv = (
            await rl.question('API key environment variable name: ')
        ).trim();

        if (!sourceName || !baseUrl || !modelID || !apiKeyEnv) {
            console.log(chalk.red('All fields are required.'));
            process.exitCode = 1;
            return;
        }

        const sources = loadSources();

        if (
            sources.some(
                (source) =>
                    source.sourceName.toLowerCase() === sourceName.toLowerCase()
            )
        ) {
            console.log(chalk.red(`Source "${sourceName}" already exists.`));
            process.exitCode = 1;
            return;
        }

        if (!process.env[apiKeyEnv]) {
            console.log(
                chalk.yellow(
                    `Warning: ${apiKeyEnv} is not currently set in your environment.`
                )
            );
        }

        sources.push({
            sourceName,
            baseUrl,
            modelID,
            apiKeyEnv,
        });

        saveSources(sources);

        console.log(chalk.green(`\n✓ Added ${sourceName}!`));
        console.log(`Set ${apiKeyEnv} to your API key before running it.`);
    } finally {
        rl.close();
    }
};

const listSources = () => {
    const sources = loadSources();

    if (sources.length === 0) {
        console.log('No sources configured. Run `microrena add`.');
        return;
    }

    sources.forEach((source) => {
        console.log(
            `${chalk.bold(source.sourceName)} — ${source.modelID}`
        );
        console.log(`  URL: ${source.baseUrl}`);

        if (source.apiKeyEnv) {
            console.log(`  API key: $${source.apiKeyEnv}`);
        }

        console.log();
    });
};

const removeSource = (name) => {
    if (!name) {
        console.log('Usage: microrena remove <source-name>');
        process.exitCode = 1;
        return;
    }

    const sources = loadSources();
    const filtered = sources.filter(
        (source) => source.sourceName.toLowerCase() !== name.toLowerCase()
    );

    if (filtered.length === sources.length) {
        console.log(chalk.red(`Source "${name}" not found.`));
        process.exitCode = 1;
        return;
    }

    saveSources(filtered);
    console.log(chalk.green(`✓ Removed ${name}.`));
};

const runBenchmark = async (prompt) => {
    if (!prompt?.trim()) {
        console.log('Usage: microrena run "your prompt"');
        process.exitCode = 1;
        return;
    }

    const sources = loadSources();

    if (sources.length === 0) {
        console.log('No sources configured. Run `microrena add`.');
        return;
    }

    console.log('---------------------------------------------\n');

    for (const source of sources) {
        console.log(`Source: ${source.sourceName}\n`);

        const apiKey = getApiKey(source);

        if (!apiKey) {
            console.log(
                chalk.red(
                    `Missing API key. Set ${
                        source.apiKeyEnv ?? 'the configured API key'
                    } and try again.`
                )
            );
            console.log('\n---------------------------------------------\n');
            continue;
        }

        try {
            const start = performance.now();

            const result = await generateStreamingCompletion({
                source: { ...source, apiKey },
                prompt,
            });

            const latency = result.latencyMs ?? performance.now() - start;
            const completion = result.completion;
            const usage = completion?.usage;

            console.log(
                boxen(chalk.green(result.content || '(No text response)'), {
                    padding: 1,
                })
            );

            const tokensPerSecond =
                usage?.completion_tokens != null && latency > 0
                    ? usage.completion_tokens / (latency / 1000)
                    : null;

            console.log();
            console.log('Model Requested:', source.modelID);
            console.log('Model Served:', completion?.model ?? 'Unknown');
            console.log(
                'TTFT:',
                result.ttftMs != null
                    ? `${result.ttftMs.toFixed(2)}ms`
                    : 'N/A'
            );
            console.log('Latency:', `${latency.toFixed(2)}ms`);
            console.log(
                'Effective Tokens per second:',
                tokensPerSecond?.toFixed(2) ?? 'N/A'
            );
            console.log('Token Usage:');
            console.log('   Prompt:', usage?.prompt_tokens ?? 'N/A');
            console.log('   Completion:', usage?.completion_tokens ?? 'N/A');
            console.log(
                '       Reasoning:',
                usage?.completion_tokens_details?.reasoning_tokens ?? 'N/A'
            );
            console.log('   Total:', usage?.total_tokens ?? 'N/A');
            console.log('Cost:', usage?.cost ?? 'N/A');
        } catch (error) {
            console.log(chalk.red(`Request failed: ${error.message}`));
        }

        console.log('\n---------------------------------------------\n');
    }
};

const main = async () => {
    const [command, ...args] = process.argv.slice(2);

    switch (command) {
        case 'add':
            await addSource();
            break;

        case 'list':
            listSources();
            break;

        case 'remove':
            removeSource(args.join(' '));
            break;

        case 'run':
            await runBenchmark(args.join(' '));
            break;

        case undefined:
            console.log(
                'Usage: microrena <run|add|list|remove> [arguments]'
            );
            process.exitCode = 1;
            break;

        default:
            // Backward compatibility: microrena "hello"
            await runBenchmark([command, ...args].join(' '));
    }
};

try {
    await main();
} catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exitCode = 1;
}
