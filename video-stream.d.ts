import {EventEmitter} from "events";
import Muxer from "./muxers";

export default class VideoStream extends EventEmitter {
    constructor(options: {
        urlCreator?: (camId: string, websocket: any, request: any) => Promise<string>;
        wsPort: number;
        ffmpegPath?: string;
        ffmpegArgs?: { [key: string]: string } |
            ((camId: string, websocket: any, request: any) => Promise<{ [key: string]: string }>);
        timeout?: number;
        format?: "mjpeg" | "mpeg1";
        transport?: (camID: string, websocket: any, request: any) => "tcp" | "udp" | Promise<"tcp" | "udp">;
        calculateFPS?: (camID: string, websocket: any, request: any) => number | Promise<number>;
        liveMuxers?: Map<string, Muxer>,
        liveMuxersListeners?: Map<string, Function>
    });

    stop(): void;
}

