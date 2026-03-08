class MP4Exporter {
    constructor() {
      this.isExporting = false;
      this.exportCount = 0;
      this.exportMax = 0;
      this.videoEncoder = null;
      this.muxer = null;
      this.exportFileHandle = null;
    }
  
    /**
     * 書き出しを開始します。
     * @param {number} width - 動画の幅
     * @param {number} height - 動画の高さ
     * @param {number} fps - フレームレート (例: 30)
     * @param {number} totalFrames - 書き出す合計フレーム数
     * @param {string} suggestedName - ダイアログの初期ファイル名
     */
    async start(width, height, fps, totalFrames, suggestedName) {
      if (this.isExporting) return;
  
      try {
        const opts = {
          types: [{
            description: 'MP4 Video',
            accept: {'video/mp4': ['.mp4']},
          }],
          suggestedName: suggestedName
        };
        // File System Access API に対応しているブラウザのみ
        if (window.showSaveFilePicker) {
          this.exportFileHandle = await window.showSaveFilePicker(opts);
        }
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.error('File System Access API error:', e);
        } else {
          console.log('Export cancelled by user');
        }
        return;
      }
  
      this.exportCount = 0;
      this.exportMax = totalFrames;
      this.fps = fps;
  
      // Mp4Muxerの初期化 (グローバルにある Mp4Muxer を使用)
      this.muxer = new Mp4Muxer.Muxer({
        target: new Mp4Muxer.ArrayBufferTarget(),
        video: {
          codec: 'avc',
          width: width,
          height: height
        },
        fastStart: 'in-memory'
      });
  
      this.videoEncoder = new VideoEncoder({
        output: (chunk, meta) => this.muxer.addVideoChunk(chunk, meta),
        error: e => console.error(e)
      });
  
      this.videoEncoder.configure({
        codec: 'avc1.4d002a', // AVC Main Profile Level 4.2 (互換性が高く高品質)
        width: width,
        height: height,
        bitrate: 20_000_000, // 20 Mbps 高画質
        framerate: fps
      });
  
      this.isExporting = true;
      console.log(`Export started: ${this.exportMax} frames`);
    }
  
    /**
     * 毎フレームの描画後に呼び出して、1フレームを動画に記録します。
     * @param {HTMLCanvasElement} canvasElement - p5.jsなどのCanvas要素
     */
    captureFrame(canvasElement) {
      if (!this.isExporting) return;
  
      // タイムスタンプはマイクロ秒 (1,000,000 μs = 1秒)
      let frame = new VideoFrame(canvasElement, { timestamp: this.exportCount * 1e6 / this.fps });
      // 1秒ごとにキーフレームを設定
      this.videoEncoder.encode(frame, { keyFrame: this.exportCount % this.fps === 0 });
      frame.close();
  
      this.exportCount++;
      if (this.exportCount % this.fps === 0) {
        console.log(`Exporting: ${this.exportCount} / ${this.exportMax}`);
      }
  
      // 指定フレーム数に達したら終了
      if (this.exportCount >= this.exportMax) {
        this.isExporting = false;
        this.finish();
      }
    }
  
    /**
     * 書き出しを完了し、ファイルとして保存します。
     */
    async finish() {
      console.log("Finalizing video...");
      await this.videoEncoder.flush();
      this.muxer.finalize();
  
      let buffer = this.muxer.target.buffer;
      let blob = new Blob([buffer], { type: 'video/mp4' });
  
      if (this.exportFileHandle) {
        try {
          const writable = await this.exportFileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          console.log("MP4 saved successfully.");
        } catch (e) {
          console.error("Error writing file:", e);
        }
      } else {
        // File System Access API に非対応のブラウザ用フォールバック
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = `exported_video.mp4`;
        a.click();
        URL.revokeObjectURL(url);
        console.log("MP4 downloaded via fallback.");
      }
  
      this.videoEncoder = null;
      this.muxer = null;
      this.exportFileHandle = null;
    }
  }
  
  // シングルトンとしてエクスポート
  window.exporter = new MP4Exporter();
