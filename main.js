document.getElementById('theme_cotinuous_01').onchange = function () {
    const container = document.getElementById('borderInputs_01');
    if (this.checked) {
        for (let i = 2; i <= 3; i++) {
            const div = document.createElement('div');
            div.innerHTML = `${i}曲目の赤条件:<input type="number" name="red_number_01_${i}" min="1">
                            ${i}曲目の金条件:<input type="number" name="gold_number_01_${i}" min="1">`;
            div.id = `borderInputs_01_${i}`;
            container.appendChild(div);
        }
    } else {
        for (let i = 2; i <= 3; i++) {
            const div = document.getElementById(`borderInputs_01_${i}`);
            if (div) container.removeChild(div);
        }
    }
};

document.getElementById('theme_cotinuous_02').onchange = function () {
    const container = document.getElementById('borderInputs_02');
    if (this.checked) {
        for (let i = 2; i <= 3; i++) {
            const div = document.createElement('div');
            div.innerHTML = `${i}曲目の赤条件:<input type="number" name="red_number_02_${i}" min="1">
                            ${i}曲目の金条件:<input type="number" name="gold_number_02_${i}" min="1">`;
            div.id = `borderInputs_02_${i}`;
            container.appendChild(div);
        }
    } else {
        for (let i = 2; i <= 3; i++) {
            const div = document.getElementById(`borderInputs_02_${i}`);
            if (div) container.removeChild(div);
        }
    }
};


document.getElementById('theme_cotinuous_03').onchange = function () {
    const container = document.getElementById('borderInputs_03');
    if (this.checked) {
        for (let i = 2; i <= 3; i++) {
            const div = document.createElement('div');
            div.innerHTML = `${i}曲目の赤条件:<input type="number" name="red_number_03_${i}" min="1">
                            ${i}曲目の金条件:<input type="number" name="gold_number_03_${i}" min="1">`;
            div.id = `borderInputs_03_${i}`;
            container.appendChild(div);
        }
    } else {
        for (let i = 2; i <= 3; i++) {
            const div = document.getElementById(`borderInputs_03_${i}`);
            if (div) container.removeChild(div);
        }
    }
};



document.getElementById('generateJsonBtn').onclick = function () {
    function getRadioValue(name) {
        const ele = document.querySelector(`input[name="${name}"]:checked`);
        return ele ? ele.value : null;
    }

    function getValue(name) {
        const ele = document.querySelector(`input[name="${name}"]`);
        if (!ele) return null;

        if (ele.type === 'file') {
            return ele.files[0] ? ele.files[0].name : "";
        }
        if (ele.type === 'number') {
            // 未入力の場合 0 を返す
            return parseInt(ele.value, 10) || 0;
        }
        if (ele.type === 'range') {
            return parseFloat(ele.value);
        }
        return ele.value;
    }

    function isChecked(name) {
        const ele = document.querySelector(`input[name="${name}"]`);
        return ele ? ele.checked : false;
    }

    // 難易度マッピング
    function mapDifficulty(value) {
        switch (value) {
            case 'easy': return 0;
            case 'normal': return 1;
            case 'hard': return 2;
            case 'master': return 3;
            case 'another': return 4;
            default: return 3; // デフォルトを鬼譜面とする
        }
    }

    function mapThemeGenre(value) {
        if (!value) return "";
        if (value === 'parfect') return 'Perfect';
        // 1文字目を大文字化
        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    // --- JSON構築 ---

    const result = {
        title: getValue('dani_title'),
        tja_Path: [
            getValue('tja_01'),
            getValue('tja_02'),
            getValue('tja_03')
        ],
        tja_Diff: [
            mapDifficulty(getRadioValue('diff_01')),
            mapDifficulty(getRadioValue('diff_02')),
            mapDifficulty(getRadioValue('diff_03'))
        ],
        "tja_Genre": [
            getValue('genrename_01'),
            getValue('genrename_02'),
            getValue('genrename_03')
        ],
        tja_Hidden: [
            isChecked('hiddencheck_01'), // name属性で検索 (正しい)
            isChecked('hiddencheck_02'),
            isChecked('hiddencheck_03')
        ],
        theme_Genre: [
            mapThemeGenre(getRadioValue('theme_genre_01')),
            mapThemeGenre(getRadioValue('theme_genre_02')),
            mapThemeGenre(getRadioValue('theme_genre_03'))
        ],
        theme_continuous: [
            !document.getElementById('theme_cotinuous_01').checked,
            !document.getElementById('theme_cotinuous_02').checked,
            !document.getElementById('theme_cotinuous_03').checked
        ],
        theme_Gauge: {
            red: getValue('gauge_red')+".0",
            gold: getValue('gauge_gold')+".0"
        },
        theme_Borders: []
    };

    // --- theme_Borders の構築ロジック ---
    for (let i = 1; i <= 3; i++) {
        const i_str = String(i).padStart(2, '0'); // "01", "02", "03"
        const isIndividualCheckbox = document.getElementById(`theme_cotinuous_${i_str}`);
        const isIndividual = isIndividualCheckbox ? isIndividualCheckbox.checked : false;
        
        const borderData = {
            values: []
        };

        borderData.values.push({
            red: getValue(`red_number_${i_str}`),
            gold: getValue(`gold_number_${i_str}`)
        });

        if (isIndividual) {
            // 2曲目の値
            borderData.values.push({
                red: getValue(`red_number_${i_str}_2`),
                gold: getValue(`gold_number_${i_str}_2`)
            });
            // 3曲目の値
            borderData.values.push({
                red: getValue(`red_number_${i_str}_3`),
                gold: getValue(`gold_number_${i_str}_3`)
            });
        }
        
        result.theme_Borders.push(borderData);
    }
    const jsonString = JSON.stringify(result, null, 2);
    // デバッグ用の表示
    document.getElementById('jsonResult').textContent = jsonString;
    // BlobからURLを生成し、クリックイベントを発生させる
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Dan.json';
    document.body.appendChild(a);
    a.click();
    // aタグとURLを削除
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};




document.addEventListener('DOMContentLoaded', () => {
    // 対象となるラジオボタンのname属性のリスト
    const radioGroupNames = ['theme_genre_01', 'theme_genre_02', 'theme_genre_03'];

    /**
     * ラジオボタンの無効化状態を更新する関数
     */
    function updateRadioDisabledState() {

        // 3つのグループで現在選択されている値のリストを作成
        // (例: ['parfect', 'good', null] のようになり、未選択は null)
        const selectedValues = radioGroupNames.map(name => {
            const checkedRadio = document.querySelector(`input[name="${name}"]:checked`);
            return checkedRadio ? checkedRadio.value : null;
        });

        // 3つのグループをそれぞれループ処理
        radioGroupNames.forEach(name => {
            // 現在処理中のグループで選択されている値 (なければ undefined)
            const currentValue = document.querySelector(`input[name="${name}"]:checked`)?.value;

            // 現在処理中のグループに属するすべてのラジオボタンを取得
            const currentRadios = document.querySelectorAll(`input[name="${name}"]`);

            currentRadios.forEach(radio => {
                // このラジオボタンの値が「選択済みリスト」に含まれているか
                const isSelectedElsewhere = selectedValues.includes(radio.value);

                if (isSelectedElsewhere) {
                    // 他（または自身）のグループで選択されている場合

                    // それが自分自身の選択値で *ない* 場合のみ無効化する
                    // (自分自身が選択しているものは無効化しない)
                    radio.disabled = (radio.value !== currentValue);
                } else {
                    // どのグループでも選択されていない項目は、必ず有効化する
                    radio.disabled = false;
                }
            });
        });
    }

    // ページ上のすべての「条件」ラジオボタン（nameが "theme_genre_" で始まるもの）を取得
    document.querySelectorAll('input[name^="theme_genre_"]').forEach(radio => {
        // 各ラジオボタンに「変更」イベントリスナーを追加
        radio.addEventListener('change', updateRadioDisabledState);
    });

    // ページ読み込み時にも一度実行（初期状態を反映するため）
    updateRadioDisabledState();
});