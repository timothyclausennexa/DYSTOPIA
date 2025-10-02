import type { AbstractMsg, BitStream } from "./net";

export enum ChatChannel {
    Global,
    Zone,
    Clan,
    Whisper,
    System,
}

export class ChatMsg implements AbstractMsg {
    channel: ChatChannel = ChatChannel.Global;
    message = "";
    senderId = 0;
    senderName = "";
    recipientId = 0; // For whispers

    serialize(s: BitStream) {
        s.writeBits(this.channel, 3); // 3 bits for 5 channels
        s.writeString(this.message, 200); // Max 200 characters
        s.writeBits(this.senderId, 16);
        s.writeString(this.senderName, 16);
        s.writeBits(this.recipientId, 16);
    }

    deserialize(s: BitStream) {
        this.channel = s.readBits(3);
        this.message = s.readString(200);
        this.senderId = s.readBits(16);
        this.senderName = s.readString(16);
        this.recipientId = s.readBits(16);
    }
}
