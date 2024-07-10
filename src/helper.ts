import { log, Message } from "wechaty";
import * as PUPPET from "wechaty-puppet";
import fs from "fs";
import path, { dirname } from "path";
import moment from 'moment';
import { fileURLToPath } from 'node:url'
const __dirname = dirname(fileURLToPath(import.meta.url))
import dotenv from 'dotenv'
import { getGptReply, getGptSummary } from "./openai.js";
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

export const LOGPRE = "[PadLocalDemo]"

export async function getMessagePayload(message: Message, bot: any) {
    const room = message.room();
    const roomName = await room?.topic() || "";
    const userName = message.talker().name();
    const time = message.date();
    const contact = message.talker() // 发消息人
    const alias = (await contact.alias()) || (await contact.name()) // 发消息人昵称
    const name = await contact.name() // 微信名称
    const receiver = message.to() // 消息接收人
    const remarkName = await contact.alias() || "" // 备注名称
    const content = message.text() // 消息内容
    const isRoom = roomWhiteList.includes(roomName) && content.includes(`${botName}`) // 是否在群聊白名单内并且艾特了机器人
    const isAlias = aliasWhiteList.includes(remarkName) || aliasWhiteList.includes(name) // 发消息的人是否在联系人白名单内

    switch (message.type()) {
        case PUPPET.types.Message.Text:
            log.silly(LOGPRE, `get message text: ${message.text()}`);
            const text = message.text();
            const isBotSelf = botName === remarkName || botName === name // 是否是机器人自己
            // 写入到本地
            const today = moment().format("YYYY-MM-DD");
            if (!fs.existsSync(path.resolve(__dirname, `./data/${today}/${roomName}`))) {
                fs.mkdirSync(path.resolve(__dirname, `./data/${today}/${roomName}`));
            }
            const filePath = path.resolve(
                __dirname,
                `./data/${today}/${roomName}/${roomName}.txt`
            );
            const data = `${moment(time).format('YYYY-MM-DD HH:mm:ss')}:\n${userName}:\n${text}\n\n`;
            fs.appendFile(filePath, data, (err: any) => {
                if (err) {
                    console.log(err);
                } else {
                    // console.log("写入成功");
                }
            });

            // 总结今日聊天内容
            if (text.includes(`${botName}`) && text.includes("总结一下")) { 
                console.log(filePath);
                const fileContent = fs.readFileSync(filePath, "utf-8");
                const result = await getGptSummary(fileContent)
                const resopone = result.choices?.[0].message.content || ''
                if(!resopone) return
                if (isRoom && room) {
                    room.say(resopone)
                }
                if (isAlias && !room) { 
                    contact.say(resopone)
                }
                return
            }

            // TODO 你们可以根据自己的需求修改这里的逻辑
            if (isBotSelf) return // 如果是机器人自己发送的消息或者消息类型不是文本则不处理
            try {
                // 区分群聊和私聊
                if (isRoom && room) {
                    const question = ((await message.mentionText()) || content).replace(`${botName}`, '') // 去掉艾特的消息主体
                    console.log('🌸🌸🌸 / question: ', question)
                    let response = await getGptReply(question)
                    response = response.replace(`Via ${OPENAI_MODEL}`, "")
                    await room.say(response)
                }
                // 私人聊天，白名单内的直接发送
                if (isAlias && !room) {
                    console.log('🌸🌸🌸 / content: ', content)
                    let response = await getGptReply(content)
                    response = response.replace(`Via ${OPENAI_MODEL}`, "")
                    await contact.say(response)
                }
            } catch (e) {
                console.error(e)
            }
                    
            break;

        case PUPPET.types.Message.Attachment:
        case PUPPET.types.Message.Audio: {
            const attachFile = await message.toFileBox();

            const dataBuffer = await attachFile.toBuffer();

            log.info(LOGPRE, `get message audio or attach: ${dataBuffer.length}`);

            break;
        }

        case PUPPET.types.Message.Video: {
            const videoFile = await message.toFileBox();

            const videoData = await videoFile.toBuffer();

            log.info(LOGPRE, `get message video: ${videoData.length}`);

            break;
        }

        case PUPPET.types.Message.Emoticon: {
            const emotionFile = await message.toFileBox();

            const emotionJSON = emotionFile.toJSON();
            log.info(LOGPRE, `get message emotion json: ${JSON.stringify(emotionJSON)}`);

            const emotionBuffer: Buffer = await emotionFile.toBuffer();

            log.info(LOGPRE, `get message emotion: ${emotionBuffer.length}`);

            break;
        }

        case PUPPET.types.Message.Image: {
            const contact = message.talker() // 发消息人
            const room = message.room() // 是否是群消息
            const roomName = (await room?.topic()) || "" // 群名称
            const alias = (await contact.alias()) || (await contact.name()) // 发消息人昵称

            // const messageImage = await message.toImage();

            // const thumbImage = await messageImage.thumbnail();
            // const thumbImageData = await thumbImage.toBuffer();

            // log.info(LOGPRE, `get message image, thumb: ${thumbImageData.length}`);

            // const hdImage = await messageImage.hd();
            // const hdImageData = await hdImage.toBuffer();

            // log.info(LOGPRE, `get message image, hd: ${hdImageData.length}`);

            // const artworkImage = await messageImage.artwork();
            // const artworkImageData = await artworkImage.toBuffer();

            // log.info(LOGPRE, `get message image, artwork: ${artworkImageData.length}`);

            // 保存处理图片
            const fileBox = await message.toFileBox();
            const today = moment().format("YYYY-MM-DD");
            if (!fs.existsSync(path.resolve(__dirname, `./data/${today}/${roomName}/image`))) {
                fs.mkdirSync(path.resolve(__dirname, `./data/${today}/${roomName}/image`));
            }
            const filePath = path.resolve(
                __dirname,
                `./data/${today}/${roomName}/image/${alias}-${fileBox.name}`
            );
            await fileBox.toFile(filePath, true);
            break;
        }

        case PUPPET.types.Message.Url: {
            const urlLink = await message.toUrlLink();
            log.info(LOGPRE, `get message url: ${JSON.stringify(urlLink)}`);

            const urlThumbImage = await message.toFileBox();
            const urlThumbImageData = await urlThumbImage.toBuffer();

            log.info(LOGPRE, `get message url thumb: ${urlThumbImageData.length}`);

            break;
        }

        case PUPPET.types.Message.MiniProgram: {
            const miniProgram = await message.toMiniProgram();

            log.info(LOGPRE, `MiniProgramPayload: ${JSON.stringify(miniProgram)}`);

            break;
        }
    }
}

export async function dingDongBot(message: Message) {
    if (message.to()?.self() && message.text().indexOf("ding") !== -1) {
        await message.talker().say(message.text().replace("ding", "dong"));
    }
}
