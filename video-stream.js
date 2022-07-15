"use strict";
Object.defineProperty(exports, "__esModule", {value: true});
exports.VideoStream = void 0;
const events_1 = require("events");
const ws_1 = require("ws");
const muxers = require('./muxers')

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
     *         format?: "mjpeg" | "mpeg1";
     *         calculateFPS?: (camID: string) => number | Promise<number>;
     *     }} options
     */
    constructor(options) {
        super();
        this.format = options.format ?? 'mpeg1'
        this.liveMuxers = new Map();
        this.liveMuxerListeners = new Map();
        this.wsServer = new ws_1.Server({port: options?.wsPort || 9999});
        this.wsServer.on('connection', async (socket, request) => {
            this.emit('connection', socket, request)
            if (!request.url) {
                return;
            }
            let liveUrl = await options.urlCreator(getUrl(request.url));
            let fps = (await options.calculateFPS?.(getUrl(request.url))) ?? 1;
            if (liveUrl === "403") {
                socket.send(JSON.stringify({
                    code: 403,
                    errMsg: "This camera is disabled. In order to stream this camera you need to enable it."
                }))
                return;
            }
            if (liveUrl === "500") {
                socket.send(JSON.stringify({
                    code: 500,
                    errMsg: "Unknown error occurred. If it consists contact the support."
                }))
                return;
            }
            if (!liveUrl) {
                socket.send(JSON.stringify({
                    code: 1,
                    errMsg: "There is a problem with the camera configuration. Check the camera config."
                }))
                return;
            }
            console.log('Socket connected', request.url);
            socket.id = Date.now().toString();
            socket.liveUrl = liveUrl;
            if (!this.liveMuxers.has(liveUrl)) {
                let muxer = new muxers.Muxer({...options, url: liveUrl, fps: fps}, options.format);
                this.liveMuxers.set(liveUrl, muxer);
                muxer.on('liveErr', async errMsg => {
                    socket.send(JSON.stringify({
                        code: 2,
                        errMsg: "Cannot connect to the camera. Check the camera configurations and fix them."
                    }))
                    console.log('Error go live', errMsg);
                    socket.send(4104);
                    // code should be in [4000,4999] ref https://tools.ietf.org/html/rfc6455#section-7.4.2
                    socket.close(4104, errMsg);
                });
                let listenerFunc = data => {
                    socket.send(data);
                };
                muxer.on('log', async message => {
                    socket.send(JSON.stringify({
                        code: 3,
                        errMsg: message
                    }))
                })
                muxer.on('mpeg1data', listenerFunc);
                this.liveMuxerListeners.set(`${liveUrl}-${socket.id}`, listenerFunc);
            } else {
                let muxer = this.liveMuxers.get(liveUrl);
                if (muxer) {
                    let listenerFunc = data => {
                        socket.send(data);
                    };
                    muxer.on('log', async message => {
                        socket.send(JSON.stringify({
                            code: 3,
                            errMsg: message
                        }))
                    })
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
