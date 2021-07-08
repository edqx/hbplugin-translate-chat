import fetch from "node-fetch";

import { GameDataMessage, RpcMessage, SendChatMessage } from "@skeldjs/protocol";

import {
    ClientLanguage,
    Connection,
    EventListener,
    HindenburgPlugin,
    Plugin,
    Room
} from "@skeldjs/hindenburg";

import { PlayerSendChatEvent } from "@skeldjs/core";
import { ReliablePacket } from "@skeldjs/protocol";

const gameKeywordToLocale = {
    [ClientLanguage.English]: "en",
    [ClientLanguage.SpanishLatinAmerica]: "es",
    [ClientLanguage.PortugueseBrazil]: "pt",
    [ClientLanguage.Portuguese]: "pt",
    [ClientLanguage.Korean]: "ko",
    [ClientLanguage.Russian]: "ru",
    [ClientLanguage.Dutch]: "de",
    [ClientLanguage.Filipino]: "en",
    [ClientLanguage.French]: "fr",
    [ClientLanguage.German]: "de",
    [ClientLanguage.Italian]: "it",
    [ClientLanguage.Japanese]: "ja",
    [ClientLanguage.Spanish]: "es",
    [ClientLanguage.ChineseSimplified]: "zh",
    [ClientLanguage.ChineseTraditional]: "zh",
    [ClientLanguage.Irish]: "ga"
};

function generateHerpDerp(length: number) {
    const randomLen = Math.ceil(Math.random() * length);
    let str = "";
    for (let i = 0; i < randomLen; i++) {
        str += " " + (Math.random() > 0.5 ? "herp" : "derp");
    }

    return str.trim();
}

@HindenburgPlugin({
    id: "hbplugin-translate-chat",
    version: "1.0.0",
    order: "none"
})
export default class extends Plugin {
    async sendChatMessageTo(senderNetId: number, message: string, connection: Connection) {
        await connection.sendPacket(
            new ReliablePacket(
                connection.getNextNonce(),
                [
                    new GameDataMessage(
                        connection.room!.code,
                        [
                            new RpcMessage(
                                senderNetId,
                                new SendChatMessage(message)
                            )
                        ]
                    )
                ]
            )
        );
    }

    @EventListener("player.chat")
    async onSendChat(ev: PlayerSendChatEvent<Room>) {
        const playerConnection = ev.room.connections.get(ev.player.id);

        const sourceLocale = playerConnection
            ? (gameKeywordToLocale as any)[playerConnection.language] || "en"
            : "en";

        if (ev.message) {
            ev.message.cancel();

            if (this.config.herpderp) {
                const numHerpDerps = ev.chatMessage.split(" ").length;
                const herpderp = generateHerpDerp(numHerpDerps);
                
                for (const [ , connection ] of ev.room.connections) {
                    if (connection === playerConnection)
                        continue;

                    this.sendChatMessageTo(ev.player.control.netid, herpderp, connection);
                }
            } else {
                for (const [ , connection ] of ev.room.connections) {
                    if (connection === playerConnection)
                        continue;

                    const targetLocale = (gameKeywordToLocale as any)[connection.language] || "en";

                    if (sourceLocale !== targetLocale) {
                        this.logger.info("Attempting translate from %s->%s.",
                            sourceLocale, targetLocale);

                        const res = await fetch("https://libretranslate.de/translate", {
                            method: "POST",
                            body: JSON.stringify({
                                q: ev.chatMessage,
                                source: sourceLocale,
                                target: targetLocale
                            }),
                            headers: {
                                "Content-Type": "application/json"
                            }
                        });

                        if (res.status === 200) {
                            const json = await res.json();
                            const translatedText = json.translatedText?.trim();

                            const chatMessage = translatedText && translatedText !== ev.chatMessage
                                ? ev.chatMessage + " (" + translatedText + ")"
                                : ev.chatMessage;

                            this.logger.info("Got translation:");
                            this.logger.info(" - Original: %s", ev.chatMessage);
                            this.logger.info(" - Translated: %s", translatedText);

                            await this.sendChatMessageTo(ev.player.control.netid, chatMessage, connection);
                        } else {
                            this.logger.warn("Failed to get message translate from %s->%s: %s",
                                sourceLocale, targetLocale, res.status);
                        }
                    } else {
                        await this.sendChatMessageTo(ev.player.control.netid, ev.chatMessage, connection);
                    }
                }
            }
        }
    }
}