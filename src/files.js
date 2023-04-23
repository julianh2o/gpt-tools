import chuldProcess from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import util from 'util'
const exec = util.promisify(chuldProcess.exec)

export const readDocxAsMarkdown = async (filePath) => {
    const tempFilePath = path.join('/tmp', `${Date.now()}.markdown`)

    try {
        await exec(
            `pandoc -f docx -t markdown "${filePath}" -o "${tempFilePath}"`
        )
        const markdownContent = await fs.readFile(tempFilePath, 'utf8')
        return markdownContent
    } catch (error) {
        console.error(`Error converting file: ${error}`)
        return null
    } finally {
        // Clean up temp file
        await fs.unlink(tempFilePath)
    }
}
