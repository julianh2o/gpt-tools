import * as gpt from './gpt.js'
import * as templates from './templates.js'
import * as files from './files.js'
import { PineconeClient } from 'pinecone-client'
import path from 'path'
import _ from 'lodash'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import chalk from 'chalk'

const PINECONE_INDEX = process.env.PINECONE_INDEX
const PINECONE_API_KEY = process.env.PINECONE_API_KEY

const pinecone = new PineconeClient({
    apiKey: PINECONE_API_KEY,
    baseUrl: `https://${PINECONE_INDEX}`,
    namespace: 'remember',
})

export const getContext = async (query) => {
    const embedding = await gpt.getEmbedding(query)
    const { matches } = await pinecone.query({
        topK: 15,
        vector: embedding,
        includeMetadata: true,
    })
    return matches
}

const chunkFactories = [
    {
        extensions: ['.txt'],
        f: async (file) => {
            const content = await fs.readFile(file, 'utf-8')
            return requestChunks(content, 'documentEmbeddings.tmpl')
        },
    },
    {
        extensions: ['.docx'],
        f: async (file) => {
            const content = await files.readDocxAsMarkdown(file)
            return requestChunks(content, 'documentEmbeddings.tmpl')
        },
    },
]

export const getChunksForFile = async (file) => {
    const ext = path.extname(file)
    const factory = _.find(chunkFactories, (factory) =>
        factory.extensions.includes(ext)
    )
    if (!factory) throw new Error('Factory not found for extension: ' + ext)

    return factory.f(file)
}

const requestChunksImpl = async (content, template) => {
    const messages = await templates.execTemplate(template, { content })
    const chunks = await gpt.chatCompletion(messages, {
        format: 'json',
    })
    return _.map(chunks, (chunk) => {
        return {
            ...chunk,
            id: uuidv4(),
            tokens: gpt.tokensForString(chunk.body),
        }
    })
}

const getSections = (content) => {
    const tokenMax = 2000
    const tokenTarget = 1500
    const tokens = gpt.tokensForString(content)
    if (tokens < tokenMax) return [content]

    const lines = content.split('\n')
    const linesWithTokens = lines.map((line) => ({
        line,
        tokens: gpt.tokensForString(line),
    }))

    const sections = []
    let currentSection = []
    let currentSectionTokenCount = 0
    for (const { line, tokens } of linesWithTokens) {
        if (currentSectionTokenCount + tokens > tokenTarget) {
            sections.push(currentSection.join('\n'))
            currentSectionTokenCount = 0
            currentSection = []
        }
        currentSectionTokenCount += tokens
        currentSection.push(line)
    }
    sections.push(currentSection.join('\n'))

    return sections
}

export const requestChunks = async (content, template) => {
    const sections = getSections(content)
    if (sections.length > 1)
        console.log(`Split the content into ${sections.length} sections`)

    const sectionChunks = []
    for (const section of sections) {
        sectionChunks.push(await requestChunksImpl(section, template))
    }
    return _.flatten(sectionChunks)
}

export const uploadChunks = async (chunks, metadata) => {
    for (const chunk of chunks) {
        const vector = {
            id: chunk.id,
            values: await gpt.getEmbedding(chunk.body),
            metadata: {
                ...metadata,
                ..._.omit(chunk, 'id'),
            },
        }
        console.log(
            chalk.blue(
                `Uploading chunk: ${JSON.stringify(
                    _.omit(vector.metadata, 'body')
                )}`
            )
        )
        console.log(vector.metadata.body)
        await pinecone.upsert({
            vectors: [vector],
        })
    }
}

export const purge = async () => {
    await pinecone.delete({ deleteAll: true })
}
