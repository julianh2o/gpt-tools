import { Configuration, OpenAIApi } from 'openai'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
export const gpt3 = 'gpt-3.5-turbo'
export const gpt4 = 'gpt-4'

const openai = new OpenAIApi(
    new Configuration({
        apiKey: OPENAI_API_KEY,
    })
)

const defaultOptions = {
    model: gpt3,
    format: 'text',
}

export const chatCompletion = async (messages, opt = {}) => {
    const options = { ...defaultOptions, ...opt }
    const completion = await openai.createChatCompletion({
        model: opt.model,
        messages,
    })
    const result = completion.data.choices[0].message.content
    if (options.format === 'json') {
        return JSON.parse(result)
    } else {
        return result
    }
}
