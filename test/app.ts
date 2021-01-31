import { VideoStream } from '../src/video-stream';

new VideoStream({
    wsPort: 9999,
    ffmpegPath: 'ffmpeg',
});
