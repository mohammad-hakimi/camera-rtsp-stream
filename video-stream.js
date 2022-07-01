"use strict";
Object.defineProperty(exports, "__esModule", {value: true});
exports.VideoStream = void 0;
const events_1 = require("events");
const mpeg1_muxer_1 = require("./mpeg1-muxer");
const ws_1 = require("ws");

function getUrl(url) {
    try {
        let parsedUrl = new URL(url, 'http://localhost');
        return parsedUrl.searchParams.get('cameraId');
    } catch (error) {
        return null;
    }
}

class VideoStream extends events_1.EventEmitter {
    /**
     *
     * @param {{
     *         urlCreator?: (camId: string) => Promise<string>;
     *         wsPort: number;
     *         ffmpegPath?: string;
     *         ffmpegArgs?: { [key: string]: string };
     *         timeout?: number;
     *         getLogImage?: (messageList: string[]) => Promise<Blob>;
     *     }} options
     */
    constructor(options) {
        super();
        this.liveMuxers = new Map();
        this.liveMuxerListeners = new Map();
        this.wsServer = new ws_1.Server({port: options?.wsPort || 9999});
        this.wsServer.on('connection', async (socket, request) => {
            const logList = []
            this.emit('connection', socket, request)
            if (!request.url) {
                return;
            }
            logList.push("Preparing...")
            options.getLogImage && socket.send(await options.getLogImage(logList))
            let liveUrl = await options.urlCreator(getUrl(request.url));
            if (!liveUrl) {
                logList.push("There is a problem with the camera configuration. Check the camera config.")
                options.getLogImage && socket.send(await options.getLogImage(logList))
                return;
            }
            console.log('Socket connected', request.url);
            socket.id = Date.now().toString();
            socket.liveUrl = liveUrl;
            if (!this.liveMuxers.has(liveUrl)) {
                let muxer = new mpeg1_muxer_1.Mpeg1Muxer({...options, url: liveUrl});
                this.liveMuxers.set(liveUrl, muxer);
                muxer.on('liveErr', async errMsg => {
                    logList.push("Couldn't connect to the camera. Check if the camera is configured correctly.")
                    options.getLogImage && socket.send(await options.getLogImage(logList))
                    console.log('Error go live', errMsg);
                    socket.send(4104);
                    // code should be in [4000,4999] ref https://tools.ietf.org/html/rfc6455#section-7.4.2
                    socket.close(4104, errMsg);
                });
                let listenerFunc = data => {
                    socket.send(data);
                };
                muxer.on('mpeg1data', listenerFunc);
                this.liveMuxerListeners.set(`${liveUrl}-${socket.id}`, listenerFunc);
            } else {
                let muxer = this.liveMuxers.get(liveUrl);
                if (muxer) {
                    let listenerFunc = data => {
                        socket.send(data);
                    };
                    muxer.on('mpeg1data', listenerFunc);
                    this.liveMuxerListeners.set(`${liveUrl}-${socket.id}`, listenerFunc);
                }
            }
            socket.on('close', () => {
                console.log('Socket closed');
                if (this.wsServer?.clients.size === 0) {
                    if (this.liveMuxers.size > 0) {
                        [...this.liveMuxers.values()].forEach(m => m.stop());
                    }
                    this.liveMuxers = new Map();
                    this.liveMuxerListeners = new Map();
                    return;
                }
                let socketLiveUrl = socket.liveUrl;
                let socketId = socket.id;
                if (this.liveMuxers.has(socketLiveUrl)) {
                    let muxer = this.liveMuxers.get(socketLiveUrl);
                    if (!muxer) {
                        return;
                    }
                    let listenerFunc = this.liveMuxerListeners.get(`${socketLiveUrl}-${socketId}`);
                    if (listenerFunc) {
                        muxer.removeListener('mpeg1data', listenerFunc);
                    }
                    if (muxer.listenerCount('mpeg1data') === 0) {
                        muxer.stop();
                        this.liveMuxers.delete(socketLiveUrl);
                        this.liveMuxers.delete(`${socketLiveUrl}-${socketId}`);
                    }
                }
            });
        });
        process.on('beforeExit', () => {
            this.stop();
        });
        console.log('Stream server started!');
    }

    stop() {
        this.wsServer?.close();
        if (this.liveMuxers.size > 0) {
            [...this.liveMuxers.values()].forEach(m => m.stop());
        }
    }
}

exports.VideoStream = VideoStream;
