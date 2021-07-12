import fetch from "node-fetch";

import {
    Language,
    Connection,
    EventListener,
    HindenburgPlugin,
    Plugin,
    Room,
    PlayerSendChatEvent,
    ReliablePacket,
    GameDataMessage,
    RpcMessage,
    SendChatMessage
} from "@skeldjs/hindenburg";

const gameKeywordToLocale = {
    [Language.English]: "en",
    [Language.SpanishAmericas]: "es",
    [Language.PortugueseBrazil]: "pt",
    [Language.Portuguese]: "pt",
    [Language.Korean]: "ko",
    [Language.Russian]: "ru",
    [Language.Dutch]: "de",
    [Language.Filipino]: "en",
    [Language.French]: "fr",
    [Language.German]: "de",
    [Language.Italian]: "it",
    [Language.Japanese]: "ja",
    [Language.Spanish]: "es",
    [Language.ChineseSimplified]: "zh",
    [Language.ChineseTraditional]: "zh",
    [Language.Irish]: "ga"
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

        const libreTranslateService = this.config.translationService || "https://libretranslate.de";

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

                        const res = await fetch(libreTranslateService + "/translate", {
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