async function readTemplate(file) {
    const contents = await fs.readFile(file, 'utf-8')
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

async function runTemplate(model, template, context) {
    const f = await readTemplate(template)
    const messages = f(context)
    const completion = await openai.createChatCompletion({
        model,
        messages,
    })
    console.log(chalk.yellow(`Usage: ${JSON.stringify(completion.data.usage)}`))
    return completion.data.choices[0].message.content
}
