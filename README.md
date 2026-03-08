# onom-gen

This project is fundamentally based on the original [onom-gen repository](https://github.com/onomuta/onom-gen) created by **onomuta**. A huge thank you for the excellent foundational code, structures, and concepts that made this possible! Additionally, it features smooth, hardware-accelerated dual exporting for both `.mp4` video format and `.png` image sequences.

## Features

- **Many Diverse Sketches**: Contains a wide range of sketches covering various aesthetics, from minimalist and 2D generative art to robust 3D particle systems.
- **Unified GUI**: An easy-to-use interface powered by `lil-gui` to dynamically alter colors, speeds, shapes, and other generative parameters on the fly.
- **High-Quality Export**: Features a built-in `export_module.js` powered by `mp4-muxer` and WebCodecs, allowing for rendering sketches directly to MP4 files and capturing crisp PNG sequences, ensuring no dropped frames.
- **Multi-Renderer Support**: Sketches are powered by a variety of popular Canvas and WebGL artistic rendering libraries, including p5.js, Three.js, PixiJS, and Paper.js.

## How to use
1. Open up a local web server in the project directory (e.g. `npx http-server`, `live-server`, or using the VSCode Live Server extension).
2. Open the individual `sketchXXX.html` files.
3. Configure settings using the lil-gui controls on the screen.
4. Export MP4s via the **"Start MP4 Export"** button (or by pressing `M`), or export PNG sequences via the **"Start PNG Sequence"** button (or `P`). The browser will prompt you for a save destination using the native file picker.

## Acknowledgements

This project is fundamentally based on the original [onom-gen repository](https://github.com/onomuta/onom-gen) created by **onomuta**. A huge thank you for the excellent foundational code, structures, and concepts that made this possible!
