const fs = require('fs');
const path = require('path');

// 設定
const INDEX_FILE = 'index.html';
const NEW_NAME_PREFIX = 'sketch';
const DIGITS = 3; // 3桁 (000, 001...)

// リネーム対象から除外する共通JSファイル
// ここに含まれるファイルはリネームされません
const IGNORE_JS_FILES = [
    'gui_handler.js', 
    'p5.min.js', 
    'p5.js', 
    'three.min.js', 
    'three.module.js',
    'lil-gui.module.min.js',
    'lil-gui.umd.min.js',
    'jquery.js'
];

// ログ出力用
const log = (msg) => console.log(`[RenameTool] ${msg}`);
const error = (msg) => console.error(`[Error] ${msg}`);

async function main() {
    const rootDir = __dirname;
    const indexPath = path.join(rootDir, INDEX_FILE);

    if (!fs.existsSync(indexPath)) {
        error(`${INDEX_FILE} が見つかりません。`);
        return;
    }

    // 1. index.html の読み込み
    let indexContent = fs.readFileSync(indexPath, 'utf-8');
    
    // バックアップ作成
    fs.writeFileSync(path.join(rootDir, `${INDEX_FILE}.bak`), indexContent);
    log(`${INDEX_FILE} のバックアップを作成しました (.bak)`);

    // リンクされているHTMLファイルを抽出
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+\.html)["']/gi;
    let match;
    const targets = [];

    while ((match = linkRegex.exec(indexContent)) !== null) {
        const htmlFileName = match[1];
        // index.html自身や外部URLは除外
        if (htmlFileName !== INDEX_FILE && !htmlFileName.startsWith('http') && !htmlFileName.startsWith('//')) {
            targets.push(htmlFileName);
        }
    }

    if (targets.length === 0) {
        log('リネーム対象のリンクが見つかりませんでした。');
        return;
    }

    log(`${targets.length} 個のファイルを検出しました。処理を開始します...`);

    for (let i = 0; i < targets.length; i++) {
        const oldHtmlName = targets[i];
        const oldHtmlPath = path.join(rootDir, oldHtmlName);

        // 新しいファイル名 (例: sketch000.html)
        const numStr = String(i).padStart(DIGITS, '0');
        const newHtmlName = `${NEW_NAME_PREFIX}${numStr}.html`;
        const newHtmlPath = path.join(rootDir, newHtmlName);
        
        // JSファイル名も連番に合わせる (例: sketch000.js)
        const newJsName = `${NEW_NAME_PREFIX}${numStr}.js`;
        const newJsPath = path.join(rootDir, newJsName);

        if (!fs.existsSync(oldHtmlPath)) {
            error(`ファイルが見つかりません: ${oldHtmlName} (スキップします)`);
            continue;
        }

        // HTMLファイルの中身を読む
        let htmlContent = fs.readFileSync(oldHtmlPath, 'utf-8');
        
        // HTML内で読み込まれているJSファイルを探す
        const scriptRegexGlobal = /<script\s+(?:[^>]*?\s+)?src=["']([^"']+\.js)["']/gi;
        let scriptMatch;
        const jsCandidates = [];

        while ((scriptMatch = scriptRegexGlobal.exec(htmlContent)) !== null) {
            const src = scriptMatch[1];
            // 外部URLは除外
            if (!src.startsWith('http') && !src.startsWith('//')) {
                jsCandidates.push(src);
            }
        }

        let targetJsName = null;

        // 候補の中からメインJSを特定するロジック
        if (jsCandidates.length > 0) {
            // 1. 除外リストに含まれないものをフィルタリング
            const filtered = jsCandidates.filter(js => !IGNORE_JS_FILES.includes(path.basename(js)));
            
            if (filtered.length > 0) {
                // 2. 'sketch' を含むファイルを優先
                const withSketch = filtered.find(js => js.toLowerCase().includes('sketch'));
                // 3. なければ、リストの最後を採用（通常、ライブラリ読み込みの後にメインスクリプトが来るため）
                targetJsName = withSketch || filtered[filtered.length - 1];
            }
        }

        // JSファイルのリネーム処理
        if (targetJsName) {
            const oldJsPath = path.join(rootDir, targetJsName);
            
            if (fs.existsSync(oldJsPath)) {
                // JSファイル名が既に新しい名前と同じなら何もしない
                if (targetJsName !== newJsName) {
                    try {
                        fs.renameSync(oldJsPath, newJsPath);
                        log(`[JS] ${targetJsName} -> ${newJsName}`);
                        
                        // HTML内の参照を更新
                        htmlContent = htmlContent.split(`"${targetJsName}"`).join(`"${newJsName}"`);
                        htmlContent = htmlContent.split(`'${targetJsName}'`).join(`'${newJsName}'`);
                    } catch (e) {
                        error(`JSリネーム失敗: ${e.message}`);
                    }
                }
            } else {
                // JSファイルが見つからない場合でもHTML内のリンク書き換えは試みない（安全のため）
                error(`JSファイルが見つかりません: ${targetJsName}`);
            }
        }

        // HTMLファイルの更新とリネーム
        fs.writeFileSync(oldHtmlPath, htmlContent); // まず内容を更新
        
        if (oldHtmlName !== newHtmlName) {
            try {
                fs.renameSync(oldHtmlPath, newHtmlPath);
                log(`[HTML] ${oldHtmlName} -> ${newHtmlName}`);
            } catch (e) {
                error(`HTMLリネーム失敗: ${e.message}`);
            }
        }

        // index.html 内のリンク文字列を置換
        // href="old.html" -> href="new.html"
        indexContent = indexContent.split(`"${oldHtmlName}"`).join(`"${newHtmlName}"`);
        indexContent = indexContent.split(`'${oldHtmlName}'`).join(`'${newHtmlName}'`);
        // 表示テキスト内のファイル名表記なども置換
        indexContent = indexContent.split(`>${oldHtmlName}<`).join(`>${newHtmlName}<`);
    }

    // 3. index.html を保存
    fs.writeFileSync(indexPath, indexContent);
    log('すべての処理が完了しました。index.html を更新しました。');
}

main();
