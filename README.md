# GPT-Tools

A collection of tools for working with GPT API. Currently, the project provides tools for creating embeddings of text in Pinecone, as well as a wrapper for generating responses to prompts using OpenAI's GPT models.

## Setup

Before using the tool, make sure you have Node.js installed. Then run:

```
npm install -g
```

Next, create environment variables for the necessary keys and values:

```
export OPENAI_API_KEY=XXX
export PINECONE_API_KEY=YYY
export PINECONE_INDEX=ZZZ
```

You can obtain API keys from OpenAI and Pinecone respectively.

## Usage

Here are some examples of how to use the tool:

```
ai # Displays help menu
ai read <path> # Creates embeddings in Pinecone for the file at <path>
ai g "<prompt>" # Tries to answer the prompt based on known context
```

Note: currently the `read` command only works with text files and docx files.
