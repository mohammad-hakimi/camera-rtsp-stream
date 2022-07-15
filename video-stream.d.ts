import {EventEmitter} from "events";

declare class VideoStream extends EventEmitter {
    constructor(options: {
        urlCreator?: (camId: string) => Promise<string>;
        wsPort: number;
        ffmpegPath?: string;
        ffmpegArgs?: { [key: string]: string };
        timeout?: number;
        format?: "mjpeg" | "mpeg1";
        calculateFPS?: (camID: string) => number | Promise<number>;
    });

    stop(): void;
}
