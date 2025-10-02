import { v2 } from "../utils/v2";
import type { AbstractMsg, BitStream } from "./net";

export class PlaceBuildingMsg implements AbstractMsg {
    buildingType = "";
    pos = v2.create(0, 0);
    rotation = 0; // 0-3

    serialize(s: BitStream) {
        s.writeGameType(this.buildingType);
        s.writeVec(this.pos, 0, 0, 1024, 1024, 16);
        s.writeBits(this.rotation, 2); // 2 bits for 4 rotations
    }

    deserialize(s: BitStream) {
        this.buildingType = s.readGameType();
        this.pos = s.readVec(0, 0, 1024, 1024, 16);
        this.rotation = s.readBits(2);
    }
}
