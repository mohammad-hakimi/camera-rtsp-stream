import {EventEmitter} from "events";

declare module 'muxers' {
    export default class Muxer extends EventEmitter {
        constructor(
            options: {
                url: string;
                ffmpegPath?: string;
                ffmpegArgs?: { [key: string]: string };
                timeout?: number;
                format?: "mjpeg" | "mpeg1";
                fps: number;
                transport?: "tcp" | "udp"
            },
            type: "mjpeg" | "mpeg1"
        )

        stop(): void;

        start(): void;

        restart(): void;
    }
}
