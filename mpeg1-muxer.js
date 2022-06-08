"use strict";
Object.defineProperty(exports, "__esModule", {value: true});
exports.Mpeg1Muxer = void 0;
const child_process_1 = require("child_process");
const events_1 = require("events");

class Mpeg1Muxer extends events_1.EventEmitter {
    constructor(options) {
        super();
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
        let spawnFfmpegArgs = [
            '-rtsp_transport',
            'tcp',
            '-i',
            options.url,
            '-f',
            'mpegts',
            '-vcodec',
            'mpeg1video',
            '-bf',
            '0',
            ...inputFfmpegArgs,
            '-'
        ];
        this.streamProcess = child_process_1.spawn(options.ffmpegPath, spawnFfmpegArgs);
        this.streamProcess.stdout?.on('data', data => {
            if (!this.streamStarted) {
                this.streamStarted = true;
            }
            this.emit('mpeg1data', data);
        });
        this.streamProcess.stderr?.on('data', data => {
            if (options.debug) {
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
        }, (options.timeout || 9) * 1000);
    }

    stop() {
        this.streamProcess?.kill();
        this.removeAllListeners();
    }
}

exports.Mpeg1Muxer = Mpeg1Muxer;
