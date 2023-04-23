import fs from 'fs/promises'
import _ from 'lodash'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const readTemplate = async (template) => {
    const contents = await fs.readFile(
        path.join(__dirname, `../templates/${template}`),
        'utf-8'
    )
    return (context) => {
        const evaluatedContent = _.template(contents)({ _, ...context })
        const lines = evaluatedContent.split('\n')
        const messages = []
        let currentMessage = null
        for (const line of lines) {
            if (line.startsWith('# ')) {
                if (currentMessage) messages.push(currentMessage)
                currentMessage = { role: line.split(' ')[1], content: '' }
            } else if (currentMessage) {
                currentMessage.content += line + '\n'
            }
        }
        if (currentMessage) messages.push(currentMessage)
        return messages
    }
}

export const execTemplate = async (template, context) => {
    const f = await readTemplate(template)
    return f(context)
}
