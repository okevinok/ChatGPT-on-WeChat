import QRCode from "qrcode";
import { WechatyBuilder } from "wechaty";
import { defaultMessage } from "./sendMessage.js";
import { log, ScanStatus } from "wechaty";
import { dingDongBot, getMessagePayload, LOGPRE } from "./helper.js";

// 初始化机器人
const CHROME_BIN = process.env.CHROME_BIN ? { endpoint: process.env.CHROME_BIN } : {}
const weChatBot = WechatyBuilder.build({
    name: 'WechatEveryDay',
    puppet: 'wechaty-puppet-wechat4u', // 如果有token，记得更换对应的puppet
    // puppet: 'wechaty-puppet-wechat', // 如果 wechaty-puppet-wechat 存在问题，也可以尝试使用上面的 wechaty-puppet-wechat4u ，记得安装 wechaty-puppet-wechat4u
    puppetOptions: {
        uos: true,
        ...CHROME_BIN,
    },
})

async function main() {
    weChatBot
        .on("scan", async (qrcode, status) => {
            const url = `https://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`;
            console.log(`💡 Scan QR Code in WeChat to login: ${status}\n${url}`);
            console.log(
                await QRCode.toString(qrcode, { type: "terminal", small: true })
            );
        })
        .on("message", async (message: any) => {
            try {
                log.info(LOGPRE, `on message: ${message.toString()}`);
                await getMessagePayload(message);
                await defaultMessage(message, weChatBot)
            } catch (e) {
                console.error(`❌ ${e}`);
            }
        })
        .on("login", (user) => {
            log.info(LOGPRE, `${user} login`);
        })

        .on("logout", (user, reason) => {
            log.info(LOGPRE, `${user} logout, reason: ${reason}`);
        })
        .on("room-invite", async (roomInvitation) => {
            log.info(LOGPRE, `on room-invite: ${roomInvitation}`);
        })

        .on("room-join", (room, inviteeList, inviter, date) => {
            log.info(LOGPRE, `on room-join, room:${room}, inviteeList:${inviteeList}, inviter:${inviter}, date:${date}`);
        })

        .on("room-leave", (room, leaverList, remover, date) => {
            log.info(LOGPRE, `on room-leave, room:${room}, leaverList:${leaverList}, remover:${remover}, date:${date}`);
        })

        .on("room-topic", (room, newTopic, oldTopic, changer, date) => {
            log.info(LOGPRE, `on room-topic, room:${room}, newTopic:${newTopic}, oldTopic:${oldTopic}, changer:${changer}, date:${date}`);
        })

        .on("friendship", (friendship) => {
            log.info(LOGPRE, `on friendship: ${friendship}`);
        })

        .on("error", (error) => {
            log.error(LOGPRE, `on error: ${error}`);
        })

    try {
        await weChatBot.start();
    } catch (e) {
        console.error(`❌ Your Bot failed to start: ${e}`);
        console.log(
            "🤔 Can you login WeChat in browser? The bot works on the desktop WeChat"
        );
    }
}
main();
