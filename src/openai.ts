import { remark } from 'remark'
import stripMarkdown from 'strip-markdown'
import OpenAIApi from 'openai'
import dotenv from 'dotenv'
const env = dotenv.config().parsed || {}// 环境参数

let config = {
    baseURL: env.OPENAI_BASE_URL,
    apiKey: env.OPENAI_API_KEY,
    organization: '',
}
if (env.OPENAI_PROXY_URL) {
    config.baseURL = env.OPENAI_PROXY_URL
}
const openai = new OpenAIApi(config)
const chosen_model = env.OPENAI_MODEL || 'gpt-4o'
export async function getGptReply(prompt: string) {
    console.log('🚀🚀🚀 / prompt', prompt)
    const response = await openai.chat.completions.create({
        messages: [
            { role: 'system', content: env.OPENAI_SYSTEM_MESSAGE },
            { role: 'user', content: prompt },
        ],
        model: chosen_model,
    })
    console.log('🚀🚀🚀 / reply', response.choices[0].message.content)
    return `${response.choices[0].message.content}\nVia ${chosen_model}`
}

export async function getGptSummary(prompt: string) {
    const response = await openai.chat.completions.create({
        messages: [
            { role: 'system', content: '你是一个群聊总结助手，总结下面的内容'},
            { role: 'user', content: prompt },
        ],
        model: chosen_model,
    })
    return response
}