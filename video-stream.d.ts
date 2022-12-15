import {EventEmitter} from "events";


declare class VideoStream extends EventEmitter {
    constructor(options: {
        urlCreator?: (camId: string, websocket: any, request: any) => Promise<string>;
        wsPort: number;
        ffmpegPath?: string;
        ffmpegArgs?: { [key: string]: string } |
            ((camId: string, websocket: any, request: any) => Promise<{ [key: string]: string }>);
        timeout?: number;
        format?: "mjpeg" | "mpeg1";
        transport?: "udp" | "tcp";
        calculateFPS?: (camID: string, websocket: any, request: any) => number | Promise<number>;
    });

    stop(): void;
}
