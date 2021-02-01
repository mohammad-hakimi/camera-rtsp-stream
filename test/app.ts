import { VideoStream } from '../src/video-stream';

let streamer = new VideoStream({
    debug: true,
    wsPort: 9999,
    ffmpegPath: 'ffmpeg',
    ffmpegArgs: {
        '-b:v': '1024K',
        '-an': '',
    }
});

setTimeout(() => {
    console.log([...streamer.liveMuxers.keys()]);
}, 9999);
