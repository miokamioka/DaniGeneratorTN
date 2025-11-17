// --- 設定 ---
const TJA_PARSER_SETTINGS = {
    /* tja_Pathの拡張子の有無(true=付ける) */
    APPEND_TJA_EXTENSION: true,

    /* theme_Gauge の値(red/gold)に.0を付けるか(true=付ける) */
    APPEND_GAUGE_DECIMAL_STRING: true
};


/**
 * EXAMタイプをジャンル名に変換します。
 * @param {string} type - EXAMタイプ (例: "jg", "jb", "r")
 * @returns {string} ジャンル名 (例: "Good", "Miss", "Roll")
 */
function mapExamType(type) {
    const examTypeMap = {
        'g': 'Gauge',       // ゲージ
        'jp': 'Perfect',    // 良の数
        'jg': 'Good',       // 可の数
        'jb': 'Miss',       // 不可の数
        'r': 'Roll',        // 連打の数
        's': 'Score',       // スコア
        'c': 'Combo',       // コンボの数
        // 'h': 'Hit',      // 叩けた数(実装未定)
    };
    return examTypeMap[type] || type.toUpperCase(); // マップにない場合は大文字化
}

/**
 * 文字列をファイルとしてダウンロードします。
 * @param {string} content - ダウンロードする文字列
 * @param {string} fileName - ファイル名
 * @param {string} mimeType - MIMEタイプ
 */
function downloadContent(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * TJAファイルの内容を解析し、dan.jsonフォーマットに変換します。
 * @param {string} tjaContent - TJAファイルの中身
 * @returns {string} 生成されたJSON文字列
 * @throws {Error} TJAファイルが段位道場でない場合にエラーをスローする
 */
function parseTjaToDanJson(tjaContent) {
    const lines = tjaContent.split('\n');

    // --- COURSE検証 ---
    let courseValid = false;
    let courseFound = false;
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('COURSE:')) {
            courseFound = true;
            const courseValue = trimmedLine.substring(7).trim();
            // COURSEが段位道場か？
            if (courseValue === '6' || courseValue.toLowerCase() === 'dan') {
                courseValid = true;
            }
            break; // COURSE行を見つけたら検証終了
        }
    }

    if (!courseFound) {
        throw new Error("エラー！ COURSEが見つかりません。");
    }
    if (!courseValid) {
        throw new Error("エラー！ 段位道場のtjaではありません。");
    }


    // dan.jsonの雛形
    const danJson = {
        title: "HOGEHOGE",
        tja_Path: [],
        tja_Diff: [],
        tja_Genre: [], // TJAのジャンル
        tja_Hidden: [],
        theme_Genre: [], // EXAMのジャンル
        theme_continuous: [],
        theme_Gauge: {
            red: 100.0,
            gold: 100.0
        },
        theme_Borders: []
    };

    const examMap = new Map(); // EXAMの条件を蓄積

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('TITLE:')) {
            danJson.title = trimmedLine.substring(6).trim();

        } else if (trimmedLine.startsWith('#NEXTSONG')) {
            const parts = trimmedLine.substring(10).trim().split(',');
            // tja_Path (設定に応じて .tja を付与)
            let path = parts[0] || "N/A";
            if (TJA_PARSER_SETTINGS.APPEND_TJA_EXTENSION) {
                path += ".tja";
            }
            danJson.tja_Path.push(path);

            danJson.tja_Genre.push(parts[2] || "N/A");
            // tja_diff (8番目の要素) - 指定がなければおに譜面を指定
            let diff = 3; // デフォルト値を3に設定
            if (parts[7] && parts[7].trim() !== '') {
                const parsedDiff = parseInt(parts[7], 10);
                if (!isNaN(parsedDiff)) {
                    diff = parsedDiff; // 有効な数値があれば上書き
                }
            }
            danJson.tja_Diff.push(diff);

            // tja_hidden(trueがあるか)
            danJson.tja_Hidden.push(parts[8] === 'true');

        } else if (trimmedLine.startsWith('EXAM')) {
            // EXAM1:g,100,100,m
            const parts = trimmedLine.split(':')[1]?.trim().split(',');
            if (!parts) continue;

            const type = parts[0];
            const redStr = parts[1];
            const goldStr = parts[2];

            if (type === 'g') {
                if (TJA_PARSER_SETTINGS.APPEND_GAUGE_DECIMAL_STRING) {
                    // ゲージ条件(.0 を付与する文字型)
                    danJson.theme_Gauge = {
                        red: redStr + ".0",
                        gold: goldStr + ".0"
                    };
                } else {
                    // ゲージ条件(数値としてパース)
                    const red = parseFloat(redStr);
                    const gold = parseFloat(goldStr);
                    if (isNaN(red) || isNaN(gold)) continue;
                    danJson.theme_Gauge = { red, gold };
                }
            } else {
                // 個別条件 (数値としてパース)
                const red = parseFloat(redStr);
                const gold = parseFloat(goldStr);

                if (isNaN(red) || isNaN(gold)) continue;

                if (!examMap.has(type)) {
                    examMap.set(type, {
                        genre: mapExamType(type),
                        values: []
                    });
                }
                examMap.get(type).values.push({ red, gold });
            }
        }
    }

    // 蓄積したEXAM条件をJSONに整形
    for (const [type, data] of examMap.entries()) {
        danJson.theme_Genre.push(data.genre);

        // 継続性の判断: EXAMが1回だけ定義されていればtrue (継続)、複数回ならfalse (楽曲別)
        const isContinuous = data.values.length === 1;
        danJson.theme_continuous.push(isContinuous);

        danJson.theme_Borders.push({ values: data.values });
    }

    return JSON.stringify(danJson, null, 2);
}

/**
 * フォームが送信されたときの処理
 * @param {Event} evt - イベントオブジェクト
 */
function handleFileSubmit(evt) {
    evt.preventDefault(); // フォームの送信（リロード）をキャンセル

    const fileInput = document.getElementById('tjaFile');
    const outputElement = document.getElementById('output');

    if (fileInput.files.length === 0) {
        outputElement.textContent = "ファイルが選択されていません。";
        return;
    }

    const file = fileInput.files[0];

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const content = e.target.result;
            const jsonResult = parseTjaToDanJson(content);

            // 画面に表示
            outputElement.textContent = jsonResult;

            // ファイルとしてダウンロード
            downloadContent(jsonResult, "Dan.json", "application/json;charset=utf-8;");

        } catch (error) {
            console.error("Error parsing TJA file:", error);
            // 変換エラー（COURSE検証エラーなど）を画面に表示
            outputElement.textContent = "変換エラー:\n" + error.message;
        }
    };

    reader.onerror = () => {
        outputElement.textContent = "ファイルの読み込みに失敗しました。";
    };

    // 大体ANSIでしょ。UTF-8(BOM付)？知らない子ですね…
    reader.readAsText(file, 'Shift_JIS');
}

// フォームのsubmitイベントを監視
document.getElementById('tjaForm').addEventListener('submit', handleFileSubmit);