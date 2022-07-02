import {EventEmitter} from "events";

declare class VideoStream extends EventEmitter {
    constructor(options: {
        urlCreator?: (camId: string) => Promise<string>;
        wsPort: number;
        ffmpegPath?: string;
        ffmpegArgs?: { [key: string]: string };
        timeout?: number;
        getLogImage?: (messageList: string[]) => Promise<string>;
    });

    stop(): void;
}
