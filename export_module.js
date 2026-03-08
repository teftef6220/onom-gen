class ExportModule {
  constructor() {
    this.isExporting = false;
    this.exportCount = 0;
    this.exportMax = 0;
    this.fps = 24;
    this.mode = null; // 'MP4' or 'PNG'

    // MP4 specific
    this.videoEncoder = null;
    this.muxer = null;
    this.exportFileHandle = null;

    // PNG specific
    this.exportDirHandle = null;
    this.filenamePrefix = "frame";
    this.pendingFrames = 0; // 追加
  }

  /**
   * MP4書き出しを開始します。
   */
  async startMP4(width, height, fps, totalFrames, suggestedName) {
    if (this.isExporting) return;

    // 解像度を偶数に強制（H.264の制限で奇数はファイルが壊れるため）
    const exportW = Math.floor(width / 2) * 2;
    const exportH = Math.floor(height / 2) * 2;

    try {
      if (window.showSaveFilePicker) {
        const opts = {
          types: [{ description: 'MP4 Video', accept: { 'video/mp4': ['.mp4'] } }],
          suggestedName: suggestedName
        };
        this.exportFileHandle = await window.showSaveFilePicker(opts);
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error('API error:', e);
      return;
    }

    this._initExport(fps, totalFrames, 'MP4');

    this.muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: { codec: 'avc', width: exportW, height: exportH },
      fastStart: 'in-memory'
    });

    this.videoEncoder = new VideoEncoder({
      output: (chunk, meta) => this.muxer.addVideoChunk(chunk, meta),
      error: e => {
        console.error("VideoEncoder Error:", e);
        alert("動画のエンコードに失敗しました: " + e.message);
      }
    });

    try {
      this.videoEncoder.configure({
        codec: 'avc1.4D4033', // レベル5.1（4K対応などの高解像度・高ビットレート用）
        width: exportW,
        height: exportH,
        bitrate: 10_000_000,
        framerate: fps
      });
    } catch (e) {
      console.error("VideoEncoder.configure failed:", e);
      alert("エンコーダーの設定に失敗しました: " + e.message);
      this.isExporting = false;
      return;
    }

    console.log(`MP4 Export started: ${this.exportMax} frames (${exportW}x${exportH})`);
  }

  /**
   * PNG連番書き出しを開始します。
   */
  async startPNG(fps, totalFrames, prefix) {
    if (this.isExporting) return;

    try {
      if (window.showDirectoryPicker) {
        // 保存先のフォルダを選択させる
        this.exportDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      } else {
        alert("お使いのブラウザはフォルダ選択に対応していません。標準のダウンロードフォルダに連続して保存されます。");
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error('API error:', e);
      return;
    }

    this._initExport(fps, totalFrames, 'PNG');
    this.filenamePrefix = prefix;

    console.log(`PNG Sequence Export started: ${this.exportMax} frames`);
  }

  _initExport(fps, totalFrames, mode) {
    this.exportCount = 0;
    this.exportMax = totalFrames;
    this.fps = fps;
    this.mode = mode;
    this.isExporting = true;
  }

  /**
   * 毎フレームの描画後に呼び出して、1フレームを記録します。
   */
  async captureFrame(canvasElement) {
    if (!this.isExporting) return;

    // 現在のフレーム番号
    const frameIndex = this.exportCount;
    if (frameIndex >= this.exportMax) {
      this.isExporting = false;
      return;
    }

    if (this.mode === 'MP4') {
      let frame;
      try {
        // アルファ値を破棄してエンコード（ADDブレンド等の崩れ対策）
        frame = new VideoFrame(canvasElement, {
          timestamp: frameIndex * 1e6 / this.fps,
          alpha: 'discard'
        });
      } catch (e) {
        frame = new VideoFrame(canvasElement, {
          timestamp: frameIndex * 1e6 / this.fps
        });
      }

      this.videoEncoder.encode(frame, { keyFrame: frameIndex % (this.fps * 2) === 0 });
      frame.close();

      this.exportCount++;
      if (this.exportCount % this.fps === 0) {
        console.log(`Exporting: ${this.exportCount} / ${this.exportMax} (MP4)`);
      }

      if (this.exportCount >= this.exportMax) {
        this.isExporting = false;
        this.finish();
      }

    } else if (this.mode === 'PNG') {
      this.pendingFrames++;

      canvasElement.toBlob(async (blob) => {
        if (!blob) {
          this.pendingFrames--;
          return;
        }
        const filename = `${this.filenamePrefix}_${String(frameIndex).padStart(4, '0')}.png`;

        try {
          if (this.exportDirHandle) {
            const fileHandle = await this.exportDirHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
          } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
          }
        } catch (e) {
          console.error("Frame export failed", e);
        } finally {
          this.pendingFrames--;
          this._checkIfFinished();
        }
      }, 'image/png');

      this.exportCount++;
      if (this.exportCount >= this.exportMax) {
        this.isExporting = false;
      }

      if (this.exportCount % this.fps === 0) {
        console.log(`Captured: ${this.exportCount} / ${this.exportMax} (PNG)`);
      }
    }
  }

  _checkIfFinished() {
    if (!this.isExporting && this.pendingFrames === 0) {
      if (this.exportCount >= this.exportMax) {
        this.finish();
      }
    }
  }

  _progressCheck() {
    // 互換性のため残すが、現在は captureFrame 内で直接処理
  }

  /**
   * 書き出しを完了します。
   */
  async finish() {
    if (this.mode === 'MP4') {
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
          console.log("✅ MP4 saved successfully to the selected location!");
          alert("MP4 export has finished saving!");
        } catch (e) {
          console.error("❌ Error writing video file:", e);
        }
      } else {
        // フォールバック
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = `exported_video.mp4`;
        a.click();
        URL.revokeObjectURL(url);
        console.log("✅ MP4 downloaded via fallback!");
        alert("MP4 export downloaded!");
      }
    } else if (this.mode === 'PNG') {
      console.log("✅ PNG Sequence Export finished successfully!");
      alert("PNG sequence export has finished saving!");
    }

    // Reset variables
    this.videoEncoder = null;
    this.muxer = null;
    this.exportFileHandle = null;
    this.exportDirHandle = null;
    this.mode = null;
  }
}

// グローバルにインスタンスを公開
window.exporter = new ExportModule();
