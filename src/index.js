#! /Users/julian/.nvm/versions/node/v18.16.0/bin/node
import { program } from 'commander'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'
import _ from 'lodash'

import chalk from 'chalk'

const directive =
    'You are a helpful assistant. You will briefly answer questions to the best of your ability. When talking about this information, refer to it as your memory or your knowledge.'

async function main(arg) {
    console.log(arg)
    const template = await readTemplate(arg)
    console.log(template({ content: 'this is my content' }))
}
program.command('test').argument('<arg>').action(main)

program
    .command('q')
    .argument('<query>', 'query to send to pinecone')
    .description('Retrieves data from pinecone')
    .action(async (query) => {
        const context = await getContext(query)
        console.log(_.map(context, 'content').join('\n'))
    })

program
    .command('purge')
    .description('Purges all data from pinecone')
    .action(async (query) => {
        await pinecone.delete({ deleteAll: true })
    })

program
    .command('chunk')
    .argument('<file>', 'file path')
    .description('')
    .action(async (file) => {
        const content = await fs.readFile(file, 'utf-8')
        const chunks = await requestChunks(content)
        const lines = content.split('\n')

        for (const chunk of chunks) {
            const chunkBody = lines
                .slice(chunk.start - 1, chunk.end + 1)
                .join('\n')
            const id = uuidv4()

            console.log(
                'Uploading chunk',
                chunkBody.length,
                JSON.stringify(chunk)
            )
            console.log(chunkBody)
            await pinecone.upsert({
                vectors: [
                    {
                        id,
                        values: await getEmbedding(chunkBody),
                        metadata: {
                            text: chunkBody,
                            file,
                            ...chunk,
                        },
                    },
                ],
            })
        }
    })

program
    .command('g')
    .argument('<prompt>', 'prompt to use')
    .description('Send a prompt to GPT-3')
    .action(async (prompt) => {
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

program
    .command('g3')
    .argument('<prompt>', 'prompt to use')
    .description('Send a prompt to GPT-3')
    .action(async (prompt) => {
        const context = await getContext(prompt)
        const messages = [
            { role: 'system', content: directive },
            ...context,
            { role: 'user', content: prompt },
        ]
        const completion = await openai.createChatCompletion({
            model,
            messages,
        })
        console.log(
            chalk.yellow(`Usage: ${JSON.stringify(completion.data.usage)}`)
        )
        console.log(completion.data.choices[0].message.content)
    })

program
    .command('remember')
    .argument('<text>', 'text to remember')
    .description('Store some text in Pinecone')
    .action(async (text) => {
        await pinecone.upsert({
            vectors: [
                {
                    id: uuidv4(),
                    values: await getEmbedding(text),
                    metadata: { text },
                },
            ],
        })
    })

program.parse()
