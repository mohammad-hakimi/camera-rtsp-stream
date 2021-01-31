import { VideoStream } from '../src/video-stream';

let streamer = new VideoStream({
    wsPort: 9999,
    ffmpegPath: 'ffmpeg',
});

setTimeout(() => {
    console.log([...streamer.liveMuxers.keys()]);
}, 9999);
