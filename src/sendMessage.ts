import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import {log, ScanStatus, WechatyBuilder} from "wechaty";
import {dingDongBot, getMessagePayload, LOGPRE} from "./helper";

// 加载环境变量
dotenv.config()
const env = dotenv.config().parsed || {}// 环境参数

// 从环境变量中导入机器人的名称
const botName = env.BOT_NAME
const OPENAI_MODEL = env.OPENAI_MODEL

// 从环境变量中导入联系人白名单
const aliasWhiteList = env.ALIAS_WHITELIST ? env.ALIAS_WHITELIST.split(',') : []

// 从环境变量中导入群聊白名单
const roomWhiteList = env.ROOM_WHITELIST ? env.ROOM_WHITELIST.split(',') : []

import { getServe } from './server.js'
import { Message } from 'wechaty'
// import { MessageType } from 'wechaty-puppet/types'
import * as PUPPET from 'wechaty-puppet'
import { getChatGPTReply } from './chatgptAPI.js'
import { WechatyInterface } from 'wechaty/impls'

// 获取当前日期的日志文件路径
function getChatLogPath(roomName: string) {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return path.join('./data/log', `${roomName}_chat_log_${year}-${month}-${day}.txt`);
}

/**
 * 默认消息发送
 * @param msg
 * @param bot
 * @param ServiceType 服务类型 'GPT' | 'Kimi'
 * @returns {Promise<void>}
 */
export async function defaultMessage(msg: Message, bot: any, ServiceType = 'GPT') {
    const getReply = getServe(ServiceType)
    const contact = msg.talker() // 发消息人
    const receiver = msg.to() // 消息接收人
    const content = msg.text() // 消息内容
    const room = msg.room() // 是否是群消息
    const roomName = (await room?.topic()) || "" // 群名称
    const alias = (await contact.alias()) || (await contact.name()) // 发消息人昵称
    const remarkName = await contact.alias() || "" // 备注名称
    const name = await contact.name() // 微信名称
    const isText = msg.type() === bot.Message.Type.Text // 消息类型是否为文本
    const isRoom = roomWhiteList.includes(roomName) && content.includes(`${botName}`) // 是否在群聊白名单内并且艾特了机器人
    const isAlias = aliasWhiteList.includes(remarkName) || aliasWhiteList.includes(name) // 发消息的人是否在联系人白名单内
    const isBotSelf = botName === remarkName || botName === name // 是否是机器人自己

    const timestamp = new Date().toLocaleString();

    // 构建日志字符串
    let logMessage = ''
    // 获取当前日期的日志文件路径
    // const chatLogPath = getChatLogPath(roomName); 

    // if (msg.type() === bot.Message.Type.File) {
    //     console.log(msg);

    //     // const fileUrl = msg.FileUrl;  // 假设微信提供了这个字段
    //     // const fileName = msg.filename;

    //     // // 下载并存储PDF文件
    //     // const fileStream = fs.createWriteStream(`./data/pdf/${fileName}`);
    //     // request(fileUrl).pipe(fileStream).on('close', () => {
    //     //     console.log(`Downloaded and saved ${fileName}`);
    //     // });
    // }
    // // 保存处理图片
    // if (msg.type() === PUPPET.types.Message.Image) {
    //     const fileBox = await msg.toFileBox();
    //     const filePath = `./data/image/${new Date().getTime()}-${roomName}-${alias}-${fileBox.name}`;
    //     logMessage = `[${timestamp}] ${roomName} - ${alias}: ${filePath}\n`;
    //     await fileBox.toFile(filePath, true);
    // } else { 
    //     logMessage = `[${timestamp}] ${roomName} - ${alias}: ${content}\n`;
    // }

    // // 追加日志到文件，如果文件不存在则创建文件
    // fs.appendFile(chatLogPath, logMessage, (err) => {
    //     if (err) {
    //         console.error('Error writing to chat log file:', err);
    //     } else {
    //         console.log(`Chat log updated: ${chatLogPath}`);
    //     }
    // });

    // TODO 你们可以根据自己的需求修改这里的逻辑
    if (isBotSelf || !isText) return // 如果是机器人自己发送的消息或者消息类型不是文本则不处理
    try {
        // 区分群聊和私聊
        if (isRoom && room) {
            const question = ((await msg.mentionText()) || content).replace(`${botName}`, '') // 去掉艾特的消息主体
            console.log('🌸🌸🌸 / question: ', question)
            let response = await getReply(question)
            response = response.replace(`Via ${OPENAI_MODEL}`, "")
            await room.say(response)
        }
        // 私人聊天，白名单内的直接发送
        if (isAlias && !room) {
            console.log('🌸🌸🌸 / content: ', content)
            let response = await getReply(content)
            response = response.replace(`Via ${OPENAI_MODEL}`, "")
            await contact.say(response)
        }
    } catch (e) {
        console.error(e)
    }
}

/**
 * 分片消息发送
 * @param message
 * @param bot
 * @returns {Promise<void>}
 */
export async function shardingMessage(message: { talker: () => any; type: () => number; text: () => any; room: () => any }, bot: { Message: { Type: { Text: any } } }) {
    const talker = message.talker()
    const isText = message.type() === bot.Message.Type.Text // 消息类型是否为文本
    if (talker.self() || message.type() > 10 || (talker.name() === '微信团队' && isText)) {
        return
    }
    const text = message.text()
    const room = message.room()
    if (!room) {
        console.log(`Chat GPT Enabled User: ${talker.name()}`)
        const response = await getChatGPTReply(text)
        await trySay(talker, response)
        return
    }
    let realText = await splitMessage(text)
    // 如果是群聊但不是指定艾特人那么就不进行发送消息
    if (text.indexOf(`${botName}`) === -1) {
        return
    }
    realText = text.replace(`${botName}`, '')
    const topic = await room.topic()
    const response = await getChatGPTReply(realText)
    const result = `${realText}\n ---------------- \n ${response}`
    await trySay(room, result)
}

// 分片长度
const SINGLE_MESSAGE_MAX_SIZE = 500

/**
 * 发送
 * @param talker 发送哪个  room为群聊类 text为单人
 * @param msg
 * @returns {Promise<void>}
 */
async function trySay(talker: { say: (arg0: any) => any }, msg: string) {
    const messages = []
    let message = msg
    while (message.length > SINGLE_MESSAGE_MAX_SIZE) {
        messages.push(message.slice(0, SINGLE_MESSAGE_MAX_SIZE))
        message = message.slice(SINGLE_MESSAGE_MAX_SIZE)
    }
    messages.push(message)
    for (const msg of messages) {
        await talker.say(msg)
    }
}

/**
 * 分组消息
 * @param text
 * @returns {Promise<*>}
 */
async function splitMessage(text: string) {
    let realText = text
    const item = text.split('- - - - - - - - - - - - - - -')
    if (item.length > 1) {
        realText = item[item.length - 1]
    }
    return realText
}
