// --- 設定 ---
const TJA_PARSER_SETTINGS = {
    APPEND_TJA_EXTENSION: true, // .tjaを自動付与するか
};

// 現在のデータ状態を保持する変数
let currentData = null;

// --- DOM要素 ---
const fileInput = document.getElementById('tjaFile');
const editorArea = document.getElementById('editorArea');
const inputTitle = document.getElementById('inputTitle');
const songListBody = document.getElementById('songListBody');
const previewElem = document.getElementById('preview');
const downloadBtn = document.getElementById('downloadBtn');

// --- イベントリスナー ---
document.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.stopPropagation();
});

// DD処理
document.addEventListener('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith('.tja')) {
        // input[type=file]と同じ処理を呼び出す
        document.getElementById('tjaFile').files = files;
        // 必要ならchangeイベントを発火
        document.getElementById('tjaFile').dispatchEvent(new Event('change'));
    }
});

// ファイル選択時
fileInput.addEventListener('change', (evt) => {
    const file = evt.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            // TJA解析
            currentData = parseTjaStructure(e.target.result);

            // UIへの反映 (エディタ構築)
            renderEditor(currentData);

            // プレビュー更新
            updatePreview();

            // エディタ表示とボタン有効化
            editorArea.style.display = 'block';
            downloadBtn.disabled = false;

        } catch (error) {
            alert("解析エラー: " + error.message);
            console.error(error);
        }
    };
    reader.readAsText(file, 'Shift_JIS'); // 必要に応じて Shift_JIS に変更
});

// タイトル変更時
inputTitle.addEventListener('input', () => {
    if (!currentData) return;
    currentData.title = inputTitle.value;
    // タイトルが変わったら段位インデックスも再計算
    currentData.danIndex = getDanIndex(currentData.title);
    updatePreview();
});

// JSON保存ボタン
downloadBtn.addEventListener('click', () => {
    if (!currentData) return;
    const jsonStr = JSON.stringify(constructFinalJson(currentData), null, 2);
    downloadContent(jsonStr, "Dan.json", "application/json");
});

// --- ロジック関数 ---

/**
 * データをもとに編集用フォーム（テーブル）を描画する
 */
function renderEditor(data) {
    inputTitle.value = data.title;
    songListBody.innerHTML = '';

    data.danSongs.forEach((song, index) => {
        const tr = document.createElement('tr');

        // 1. ファイル名
        const tdPath = document.createElement('td');
        const inputPath = document.createElement('input');
        inputPath.type = 'text';
        inputPath.value = song.path;
        inputPath.addEventListener('input', (e) => {
            song.path = e.target.value;
            updatePreview();
        });
        tdPath.appendChild(inputPath);

        // 2. 難易度 (tja_diff)
        const tdDiff = document.createElement('td');
        const inputDiff = document.createElement('input');
        inputDiff.type = 'number';
        inputDiff.value = song.difficulty; // ここで解析された難易度を表示
        inputDiff.addEventListener('input', (e) => {
            song.difficulty = parseInt(e.target.value, 3) || 0;
            updatePreview();
        });
        tdDiff.appendChild(inputDiff);

        // 3. ジャンル
        const tdGenre = document.createElement('td');
        const inputGenre = document.createElement('input');
        inputGenre.type = 'text';
        inputGenre.value = song.genre;
        inputGenre.addEventListener('input', (e) => {
            song.genre = e.target.value;
            updatePreview();
        });
        tdGenre.appendChild(inputGenre);

        // 4. ？？？ (isHidden) - チェックボックス
        const tdHidden = document.createElement('td');
        const inputHidden = document.createElement('input');
        inputHidden.type = 'checkbox';
        inputHidden.checked = song.isHidden;
        inputHidden.addEventListener('change', (e) => {
            song.isHidden = e.target.checked;
            updatePreview();
        });
        tdHidden.appendChild(inputHidden);

        // 5. 分岐設定 (BranchLock)
        const tdBranch = document.createElement('td');
        const selectBranch = document.createElement('select');
        const options = ["None", "Normal", "Advanced", "Master"];
        options.forEach(opt => {
            const el = document.createElement('option');
            el.value = opt;
            el.textContent = opt;
            if (song.branchLock === opt) el.selected = true;
            selectBranch.appendChild(el);
        });
        selectBranch.addEventListener('change', (e) => {
            song.branchLock = e.target.value;
            updatePreview();
        });
        tdBranch.appendChild(selectBranch);

        tr.appendChild(tdPath);
        tr.appendChild(tdDiff);
        tr.appendChild(tdGenre);
        tr.appendChild(tdHidden); // 追加
        tr.appendChild(tdBranch);

        songListBody.appendChild(tr);
    });
}

/**
 * 現在のデータからJSONを生成してプレビューエリアに表示
 */
function updatePreview() {
    if (!currentData) return;
    const finalObj = constructFinalJson(currentData);
    previewElem.textContent = JSON.stringify(finalObj, null, 2);
}

/**
 * 内部データ構造から最終的なJSONオブジェクトを組み立てる
 */
function constructFinalJson(data) {
    // conditionsMap を配列に変換
    const finalConditions = [];
    if (data.conditionsMap) {
        for (const [type, thresholds] of data.conditionsMap.entries()) {
            finalConditions.push({
                type: type,
                threshold: thresholds
            });
        }
    }

    return {
        title: data.title,
        danIndex: data.danIndex,
        danPlatePath: data.danPlatePath,
        danPanelSidePath: data.danPanelSidePath,
        danTitlePlatePath: data.danTitlePlatePath,
        danMiniPlatePath: data.danMiniPlatePath,
        danSongs: data.danSongs,
        conditionGauge: data.conditionGauge,
        conditions: finalConditions
    };
}

// --- パーサロジック ---

function getDanIndex(title) {
    const map = {
        "五級": 0, "四級": 1, "三級": 2, "二級": 3, "一級": 4,
        "初段": 5, "二段": 6, "三段": 7, "四段": 8, "五段": 9,
        "六段": 10, "七段": 11, "八段": 12, "九段": 13, "十段": 14,
        "玄人": 15, "名人": 16, "超人": 17, "達人": 18
    };
    // 他の文字が書かれていた場合、外伝になる。
    return map[title] !== undefined ? map[title] : 19;
}

function mapConditionType(type) {
    // 条件設定
    const map = {
        'jg': 'good',
        'jb': 'miss',
        'r': 'roll',
        'jp': 'perfect',
        's': 'score',
        'h': 'hit',
        'c': 'combo'
    };
    return map[type] || type;
}

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

// --- TJA Parser Logic ---
function parseTjaStructure(tjaContent) {
    const lines = tjaContent.split('\n');
    let courseValid = false;
    let courseFound = false;

    // COURSEチェック
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('COURSE:')) {
            courseFound = true;
            const val = trimmed.substring(7).trim().toLowerCase();
            if (val === '6' || val === 'dan') courseValid = true;
            break;
        }
    }
    if (!courseFound) throw new Error("COURSE行が見つかりません。");
    if (!courseValid) throw new Error("COURSEが6(段位)またはDanではありません。");

    const result = {
        title: "",
        danIndex: 19,
        danPlatePath: "Plate.png",
        danPanelSidePath: "panelside.png",
        danTitlePlatePath: "titleplate.png",
        danMiniPlatePath: "miniplate.png",
        danSongs: [],
        conditionGauge: { red: 0, gold: 0 },
        conditionsMap: new Map()
    };

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('TITLE:')) {
            result.title = trimmed.substring(6).trim();
            result.danIndex = getDanIndex(result.title);

        } else if (trimmed.startsWith('#NEXTSONG')) {
            // フォーマット:
            // Path(0), Sub(1), Genre(2), Wave(3), Init(4), Diff(5), Level(6), tja_diff(7), tja_hidden(8)
            const parts = trimmed.substring(10).trim().split(',');

            // Path
            let path = parts[0] || "N/A";
            if (TJA_PARSER_SETTINGS.APPEND_TJA_EXTENSION && !path.toLowerCase().endsWith('.tja')) {
                path += ".tja";
            }

            // level (Index 6) -> difficulty
            let diff = 3; // デフォルト
            if (parts[6] && parts[6].trim() !== '') {
                const d = parseInt(parts[6], 10);
                if (!isNaN(d)) diff = d;
            }

            // tja_hidden (Index 8) -> isHidden
            // 文字列 "true" かどうかを確認
            let isHidden = false;
            if (parts[8] && parts[8].trim() === 'true') {
                isHidden = true;
            }

            result.danSongs.push({
                path: path,
                difficulty: diff, // tja_diffの値
                genre: parts[2] || "N/A",
                isHidden: isHidden, // tja_hiddenの値
                branchLock: "None"
            });

        } else if (trimmed.startsWith('EXAM')) {
            const body = trimmed.split(':')[1];
            if (!body) continue;
            const parts = body.trim().split(',');
            const typeRaw = parts[0];
            const red = parseFloat(parts[1]);
            const gold = parseFloat(parts[2]);

            if (isNaN(red) || isNaN(gold)) continue;

            if (typeRaw === 'g') {
                result.conditionGauge = { red, gold };
            } else {
                const type = mapConditionType(typeRaw);
                if (!result.conditionsMap.has(type)) {
                    result.conditionsMap.set(type, []);
                }
                result.conditionsMap.get(type).push({ red, gold });
            }
        }
    }
    return result;
}