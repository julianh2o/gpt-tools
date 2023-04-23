import { PineconeClient } from 'pinecone-client'

const PINECONE_INDEX = process.env.PINECONE_INDEX
const PINECONE_API_KEY = process.env.PINECONE_API_KEY
const embeddingsModel = 'text-embedding-ada-002'

const pinecone = new PineconeClient({
    apiKey: PINECONE_API_KEY,
    baseUrl: `https://${PINECONE_INDEX}`,
    namespace: 'remember',
})

// Define a function to normalize the output embedding to a unit vector
const normalizeEmbedding = (embedding) => {
    const norm = Math.sqrt(embedding.reduce((acc, val) => acc + val ** 2, 0))
    return embedding.map((val) => val / norm)
}

export const getEmbedding = async (input) => {
    const embedding = await openai.createEmbedding({
        model: embeddingsModel,
        input,
    })
    return normalizeEmbedding(embedding.data.data[0].embedding)
}

const getContext = async (query) => {
    const embedding = await getEmbedding(query)
    const { matches } = await pinecone.query({
        topK: 15,
        vector: embedding,
        includeMetadata: true,
    })
    return matches
}

const requestChunks = async (content) => {
    const template = await readTemplate('templates/documentEmbeddings.tmpl')
    const messages = template({ content })
    const completion = await openai.createChatCompletion({
        model,
        messages,
    })
    return JSON.parse(completion.data.choices[0].message.content)
}
