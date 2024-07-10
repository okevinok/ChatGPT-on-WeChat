import { log, Message } from "wechaty";
import * as PUPPET from "wechaty-puppet";
import fs from "fs";
import path, { dirname } from "path";
import moment from 'moment';
import { fileURLToPath } from 'node:url'
// 获取 __filename 的 ESM 写法
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))

export const LOGPRE = "[PadLocalDemo]"

export async function getMessagePayload(message: Message) {
    switch (message.type()) {
        case PUPPET.types.Message.Text:
            log.silly(LOGPRE, `get message text: ${message.text()}`);
            const room = message.room();
            const roomName = await room?.topic();
            const userName = message.talker().name();
            const text = message.text();
            const time = message.date();
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
