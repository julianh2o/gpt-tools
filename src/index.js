#! /Users/julian/.nvm/versions/node/v18.16.0/bin/node
import { program } from 'commander'
import { v4 as uuidv4 } from 'uuid'
import * as embeddings from './embeddings.js'
import * as templates from './templates.js'
import * as files from './files.js'
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
    .command('script')
    .argument('<name>', 'name of the script')
    .argument('<query>', 'functionality of the script')
    .description('Creates a new script')
    .action(
        wrap(async (name,query) => {
            const script = await gpt.chatCompletion(
                await templates.execTemplate(
                    'writeScript.tmpl',
                    {
                        name,
                        query,
                        context,
                    }
                ),
            )
            await fs.writeFile(path.join("./scripts/",name+".sh"),script,"utf-8");
        })
    )

program
    .command('q')
    .argument('<query>', 'query to send to pinecone')
    .description('Retrieves data from pinecone')
    .action(
        wrap(async (query) => {
            const context = await embeddings.getContext(query)
            console.log(context)
        })
    )

program
    .command('do')
    .argument('<file>', 'file path')
    .argument('<prompt>', 'prompt')
    .action(async (file,prompt) => {
        const filePath = path.join(process.cwd(), file)
        const code = await fs.readFile(filePath,"utf-8");
        const refactored = await gpt.chatCompletion(
            await templates.execTemplate(
                'codeRefactor.tmpl',
                {
                    filePath,
                    code,
                    prompt,
                }
            ),
        )
        await fs.writeFile(`${filePath}.bak`,code,"utf-8");
        await fs.writeFile(filePath,refactored,"utf-8");
    })

program
    .command('md')
    .argument('<file>', 'file path')
    .action(async (file) => {
        const fullPath = path.join(process.cwd(), file)
        console.log(await files.readDocxAsMarkdown(fullPath))
    })

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
            const matches = await embeddings.getContext(prompt)
            const mostRelevant = await gpt.chatCompletion(
                await templates.execTemplate(
                    'selectMostRelevantEmbeddings.tmpl',
                    {
                        matches,
                        prompt,
                    }
                ),
                { format: 'json' }
            )
            const filteredMatches = _.filter(matches, (match) =>
                mostRelevant.includes(match.id)
            )
            const response = await gpt.chatCompletion(
                await templates.execTemplate('answerPromptWithContext.tmpl', {
                    matches: filteredMatches,
                    prompt,
                })
            )
            console.log(response)
        })
    )

program.parse()
