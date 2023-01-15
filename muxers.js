"use strict";
Object.defineProperty(exports, "__esModule", {value: true});
module.exports = void 0;
const child_process_1 = require("child_process");
const events_1 = require("events");

class Muxer extends events_1.EventEmitter {
    /**
     * @param {{
     *         url: string;
     *         ffmpegPath?: string;
     *         ffmpegArgs?: { [key: string]: string };
     *         timeout?: number;
     *         format?: "mjpeg" | "mpeg1";
     *         fps: number;
     *         transport?: "tcp" | "udp"
     * }} options
     * @param {"mjpeg" | "mpeg1"} type
     */
    constructor(options, type) {
        super();
        this.options = options
        this.type = type
        this.emit('log', "Stream is being initialized...")
        this.streamStarted = false;
        if (!options || typeof options == 'undefined') {
            return;
        }
        if (!options.ffmpegPath) {
            return;
        }
        if (!options.url) {
            return;
        }
        let inputFfmpegArgs = [];
        if (options.ffmpegArgs) {
            inputFfmpegArgs = Object.keys(options.ffmpegArgs).map(k => {
                if (options.ffmpegArgs?.[k]) {
                    return [k, options.ffmpegArgs[k]];
                } else {
                    return [k];
                }
            }).flat();
        }
        this.spawnFfmpegArgs = [
            '-rtsp_transport',
            options.transport ?? "tcp",
            '-i',
            options.url,
            ...(type === 'mpeg1' ? ['-f',
                'mpegts'] : ['-f', 'mjpeg']),
            ...(type === 'mpeg1' ? ['-vcodec',
                'mpeg1video'] : []),
            '-bf',
            '0',
            '-r',
            `${options.fps}`,
            ...inputFfmpegArgs,
            '-vf',
            [`fps=fps=${options.fps * 2}`, ...(options.ffmpegArgs?.['-vf'] ? [options.ffmpegArgs['-vf']] : [])].join(','),
            '-'
        ];
        this.start()

    }

    stop() {
        this.streamProcess?.kill();
        this.removeAllListeners();
    }

    start() {
        this.emit('log', "Connecting to the camera...")
        this.streamProcess = child_process_1.spawn(this.options.ffmpegPath, this.spawnFfmpegArgs);
        this.streamProcess.stdout?.on('data', data => {
            if (!this.streamStarted) {
                this.streamStarted = true;
            }
            this.emit('mpeg1data', data);
        });
        this.streamProcess.stderr?.on('data', data => {
            if (this.options.debug) {
                process.stderr.write(data);
            }
            if (data.toString('utf-8').indexOf('Server returned') >= 0) {
                let errorOutputLine = data.toString('utf-8');
                this.emit('liveErr', errorOutputLine.substr(errorOutputLine.indexOf('Server returned')));
                this.stop();
            }
        });
        this.streamProcess.on('exit', (code, signal) => {
            if (code !== 0) {
                this.emit('ffmpeg process exited with error', code, signal);
            }
        });
        setTimeout(() => {
            if (!this.streamStarted) {
                this.emit('liveErr', 'Timeout');
                this.stop();
            }
        }, (this.options.timeout || 9) * 1000);
    }
    restart() {
        this.streamProcess.kill()
        this.start()
    }
}

module.exports = Muxer;
