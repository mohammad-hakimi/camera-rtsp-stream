import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';

export interface MuxerOptions {
    url?: string;
    ffmpegArgs?: Record<string, string>;
    ffmpegPath?: string;

    /** seconds to wait for rtsp connection */
    timeout?: number;

    debug?: boolean;
}

export class Mpeg1Muxer extends EventEmitter {

    public streamProcess?: ChildProcess;

    private streamStarted: boolean = false;

    public constructor(options?: MuxerOptions) {
        super();

        if (!options || typeof options == 'undefined') { return; }
        if (!options.ffmpegPath) { return; }
        if (!options.url) { return; }

        let inputFfmpegArgs: Array<string> = [];
        if (options.ffmpegArgs && Array.isArray(options.ffmpegArgs) && options.ffmpegArgs.length > 0) {
            inputFfmpegArgs = Object.keys(options.ffmpegArgs).map(k => [k, options.ffmpegArgs![k]]).flat();
        }

        let spawnFfmpegArgs: Array<string> = [
            '-i',
            options.url,
            '-f',
            'mpegts',
            '-codec:v',
            'mpeg1video',
            ...inputFfmpegArgs,
            '-'
        ];

        this.streamProcess = spawn(options.ffmpegPath, spawnFfmpegArgs, { detached: true });

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
            if ((data as Buffer).toString('utf-8').indexOf('Server returned') >= 0) {
                let errorOutputLine: string = (data as Buffer).toString('utf-8');
                this.emit('liveErr', errorOutputLine.substr(errorOutputLine.indexOf('Server returned')));
                this.stop();
            }
        });

        this.streamProcess.on('exit', (code, signal) => {
            if (code != 0) {
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

    public stop(): void {
        this.streamProcess?.kill();
        this.removeAllListeners();
    }

}
