#! /Users/julian/.nvm/versions/node/v18.16.0/bin/node
import { program } from 'commander'
import { v4 as uuidv4 } from 'uuid'
import * as embeddings from './embeddings.js'
import * as gpt from './gpt.js'
import fs from 'fs/promises'
import _ from 'lodash'
import chalk from 'chalk'
import path from 'path'

const outputError = (err) =>
    console.log(
        err.message,
        err.stack,
        err.request && err.request.path,
        err.response && JSON.stringify(err.response.data, null, 2)
    )

const wrap = (fn) => {
    return async (...args) => {
        try {
            await fn(...args)
        } catch (err) {
            outputError(err)
        }
    }
}

program
    .command('q')
    .argument('<query>', 'query to send to pinecone')
    .description('Retrieves data from pinecone')
    .action(
        wrap(async (query) => {
            const context = await getContext(query)
            console.log(_.map(context, 'content').join('\n'))
        })
    )

program
    .command('purge')
    .description('Purges all data from pinecone')
    .action(async () => embeddings.purge())

program
    .command('read')
    .argument('<file>', 'file path')
    .description(
        'Reads the specified file, breaks it into chunks, and stores the embeddings'
    )
    .action(
        wrap(async (file) => {
            const fullPath = path.join(process.cwd(), file)
            const chunks = await embeddings.getChunksForFile(fullPath)
            await embeddings.uploadChunks(chunks, { file })
            console.log(`Uploaded ${chunks.length} chunks`)
        })
    )

program
    .command('g')
    .argument('<prompt>', 'prompt to use')
    .description('Send a prompt to GPT-3')
    .action(
        wrap(async (prompt) => {
            const matches = await getContext(prompt)
            console.log({ matches })
            const relevantEmbeddingsResponse = await runTemplate(
                model,
                'templates/selectMostRelevantEmbeddings.tmpl',
                { matches, prompt }
            )
            const mostRelevant = JSON.parse(relevantEmbeddingsResponse)
            const filteredMatches = _.filter(matches, (match) =>
                mostRelevant.includes(match.id)
            )
            const response = await runTemplate(
                model,
                'templates/answerPromptWithContext.tmpl',
                { matches: filteredMatches, prompt }
            )
            console.log(response)
        })
    )

program.parse()
