import fs from 'fs';
import path from 'path';
import axios from 'axios';

if (process.argv.length !== 4) {
  console.log(`Usage: ${path.basename(process.argv[1])} prompt negative_prompt`);
  process.exit(1);
}

const [prompt, negativePrompt] = process.argv.slice(2);
const timestamp = new Date().toISOString().replace(/[:T-]/g, '').substring(0, 14);
const outputDir = 'output';
const modifiedTemplateFile = 'modified_template.json';

fs.mkdirSync(outputDir, { recursive: true });

const template = JSON.parse(fs.readFileSync('template.json', 'utf-8'));

template.prompt = prompt;
template.negative_prompt = negativePrompt;

fs.writeFileSync(modifiedTemplateFile, JSON.stringify(template));

axios.post('http://192.168.1.50:7860/sdapi/v1/txt2img', template, { headers: { 'Content-Type': 'application/json' } })
  .then(({ data }) => {
    const imageData = data.images[0];
    const outputFile = path.join(outputDir, `img-${timestamp}.png`);
    fs.writeFileSync(outputFile, imageData, { encoding: 'base64' });
    fs.unlinkSync(modifiedTemplateFile);
  })
  .catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
