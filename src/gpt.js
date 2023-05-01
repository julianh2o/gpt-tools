import { Configuration, OpenAIApi } from 'openai'
import chalk from 'chalk'
import { get_encoding } from '@dqbd/tiktoken'
import _ from 'lodash'
import fs from 'fs/promises'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
export const gpt3 = 'gpt-3.5-turbo'
export const gpt4 = 'gpt-4'
export const embeddingsModel = 'text-embedding-ada-002'

const modelMaxTokens = {
    ['gpt-3.5-turbo']: 4097,
    ['gpt-4']: 8194,
}

const openai = new OpenAIApi(
    new Configuration({
        apiKey: OPENAI_API_KEY,
    })
)

const defaultOptions = {
    model: gpt3,
    format: 'text',
    verbose: true,
}

export const tokensForString = (str) => {
    const enc = get_encoding('cl100k_base')
    const tokens = enc.encode(str).length
    enc.free()
    return tokens
}

export const tokensForMessages = (messages) => {
    return tokensForString(_.map(messages, 'content').join('\n'))
}

export const chatCompletion = async (messages, inputOptions = {}) => {
    // const existing = await fs.readFile('/tmp/gpt.json', 'utf-8')
    // const data = JSON.parse(existing)
    // console.log(data.choices[0].message.content.substring(3380, 3650))
    // const jsonRaw = data.choices[0].message.content
    // const fixed = jsonRaw.replace(/\\\"/g, '\\\\"')
    // console.log(fixed.substring(1628 - 100, 1628 + 200))
    // const parsed = JSON.parse(fixed)
    // return parsed

    const options = { ...defaultOptions, ...inputOptions }
    const tokens = tokensForMessages(messages)
    const maxResponseTokens = modelMaxTokens[options.model] - tokens - 100
    console.log(
        chalk.green(`GPT Request: ${options.model} (tokens: ${tokens})`)
    )
    console.time(`GPT Request ${options.model} ${tokens}`)
    const completion = await openai.createChatCompletion({
        model: options.model,
        max_tokens: maxResponseTokens,
        messages,
    })
    console.timeEnd(`GPT Request ${options.model} ${tokens}`)
    if (options.verbose)
        console.log(
            chalk.yellow(`Usage: ${JSON.stringify(completion.data.usage)}`)
        )
    const result = completion.data.choices[0].message.content
    await fs.writeFile(
        '/tmp/gpt.json',
        JSON.stringify(completion.data, null, 2),
        {
            encoding: 'utf-8',
        }
    )
    if (options.format === 'json') {
        return JSON.parse(result)
    } else {
        return result
    }
}

// Define a function to normalize the output embedding to a unit vector
const normalizeEmbedding = (embedding) => {
    const norm = Math.sqrt(embedding.reduce((acc, val) => acc + val ** 2, 0))
    return embedding.map((val) => val / norm)
}

export const getEmbedding = async (input) => {
    console.log(
        chalk.green(`Generating embeddings for ${input.length} bytes...`)
    )
    const embedding = await openai.createEmbedding({
        model: embeddingsModel,
        input,
    })
    return normalizeEmbedding(embedding.data.data[0].embedding)
}
