declare module 'camera-rtsp-stream' {
    module 'muxers' {
        import {EventEmitter} from "events";
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
    module 'video-stream' {
        import {EventEmitter} from "events";
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
            });

            stop(): void;
        }

    }
}
