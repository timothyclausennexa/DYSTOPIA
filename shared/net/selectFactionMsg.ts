import type { AbstractMsg, BitStream } from "./net";

export enum Faction {
    None,
    Red,
    Blue,
    Green,
    Yellow,
    Purple,
}

export class SelectFactionMsg implements AbstractMsg {
    faction: Faction = Faction.None;

    serialize(s: BitStream) {
        s.writeBits(this.faction, 3); // 3 bits for 6 factions
    }

    deserialize(s: BitStream) {
        this.faction = s.readBits(3);
    }
}
