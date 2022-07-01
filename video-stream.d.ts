import {EventEmitter} from "events";
import {Blob} from 'buffer';

declare class VideoStream extends EventEmitter {
    constructor(options: {
        urlCreator?: (camId: string) => Promise<string>;
        wsPort: number;
        ffmpegPath?: string;
        ffmpegArgs?: { [key: string]: string };
        timeout?: number;
        getLogImage?: (messageList: string[]) => Promise<Blob>;
    });

    stop(): void;
}
