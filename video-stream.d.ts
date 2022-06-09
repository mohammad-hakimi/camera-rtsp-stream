import {EventEmitter} from "events";


declare class VideoStream extends EventEmitter {
    constructor(options: {
        urlCreator?: (camId: string) => Promise<string>;
        wsPort: number;
        ffmpegPath?: string;
        ffmpegArgs?: string;
    });

    stop(): void;
}
