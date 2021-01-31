import { EventEmitter } from 'events';
import { Mpeg1Muxer, MuxerOptions } from './mpeg1-muxer';
import { Server } from 'ws';

interface StreamOptions extends Omit<MuxerOptions, 'url'> {
    wsPort?: number;
}

interface WebSocketMeta {
    id: string;
    liveUrl: string;
}

type MpegListener = (...args: any[]) => void;

function getUrl(url: string): string | null {
    try {
        let parsedUrl: URL = new URL(url, 'http://localhost');
        return parsedUrl.searchParams.get('url');
    } catch (error) {
        return null;
    }
}

export class VideoStream extends EventEmitter {
    public liveMuxers: Map<string, Mpeg1Muxer> = new Map<string, Mpeg1Muxer>();

    private wsServer?: Server;

    private liveMuxerListeners: Map<string, MpegListener> = new Map<string, MpegListener>();

    public constructor(options?: StreamOptions) {
        super();
        this.wsServer = new Server({ port: options?.wsPort || 9999 });

        this.wsServer.on('connection', (socket, request) => {
            if (!request.url) { return };

            let liveUrl: string | null = getUrl(request.url);
            if (!liveUrl) { return; }

            console.log('Socket connected', request.url);

            (socket as unknown as WebSocketMeta).id = Date.now().toString();
            (socket as unknown as WebSocketMeta).liveUrl = liveUrl;

            if (!this.liveMuxers.has(liveUrl)) {
                let muxer: Mpeg1Muxer = new Mpeg1Muxer({ ...options, url: liveUrl });
                this.liveMuxers.set(liveUrl, muxer);

                muxer.on('liveErr', errMsg => {
                    console.log('Error go live', errMsg);

                    socket.send(4104);

                    // code should be in [4000,4999] ref https://tools.ietf.org/html/rfc6455#section-7.4.2
                    socket.close(4104, errMsg);
                });


                let listenerFunc: (...args: any[]) => void = data => {
                    socket.send(data);
                };
                muxer.on('mpeg1data', listenerFunc);

                this.liveMuxerListeners.set(`${liveUrl}-${(socket as unknown as WebSocketMeta).id}`, listenerFunc);

            } else {
                let muxer: Mpeg1Muxer | undefined = this.liveMuxers.get(liveUrl);

                if (muxer) {
                    let listenerFunc: MpegListener = data => {
                        socket.send(data);
                    };
                    muxer.on('mpeg1data', listenerFunc);

                    this.liveMuxerListeners.set(`${liveUrl}-${(socket as unknown as WebSocketMeta).id}`, listenerFunc);
                }
            }

            socket.on('close', () => {
                console.log('Socket closed');

                if (this.wsServer?.clients.size == 0) {
                    if (this.liveMuxers.size > 0) {
                        [...this.liveMuxers.values()].forEach(m => m.stop());
                    }
                    this.liveMuxers = new Map<string, Mpeg1Muxer>();
                    this.liveMuxerListeners = new Map<string, MpegListener>();
                    return;
                }

                let socketLiveUrl: string = (socket as unknown as WebSocketMeta).liveUrl;
                let socketId: string = (socket as unknown as WebSocketMeta).id;

                if (this.liveMuxers.has(socketLiveUrl)) {
                    let muxer: Mpeg1Muxer | undefined = this.liveMuxers.get(socketLiveUrl);
                    if (!muxer) { return; }
                    let listenerFunc: MpegListener | undefined = this.liveMuxerListeners.get(`${socketLiveUrl}-${socketId}`);
                    if (listenerFunc) {
                        muxer.removeListener('mpeg1data', listenerFunc);
                    }
                    if (muxer.listenerCount('mpeg1data') == 0) {
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

    public stop(): void {
        this.wsServer?.close();
        if (this.liveMuxers.size > 0) {
            [...this.liveMuxers.values()].forEach(m => m.stop());
        }
    }

}
