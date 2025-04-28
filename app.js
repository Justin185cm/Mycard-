let db;

async function initDb() {
    const SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/sql-wasm.wasm` });

    const savedDb = localStorage.getItem('cardAppDb');
    if (savedDb) {
        const uInt8Array = Uint8Array.from(atob(savedDb), c => c.charCodeAt(0));
        db = new SQL.Database(uInt8Array);
    } else {
        db = new SQL.Database();
        db.run("CREATE TABLE IF NOT EXISTS cards (id INTEGER PRIMARY KEY, name TEXT, barcode TEXT)");
    }

    loadCards();
    checkBackupReminder();
}

function saveDb() {
    const binaryArray = db.export();
    const base64String = btoa(String.fromCharCode(...binaryArray));
    localStorage.setItem('cardAppDb', base64String);
}

function loadCards() {
    const cardList = document.getElementById('cardList');
    cardList.innerHTML = '';

    const stmt = db.prepare("SELECT * FROM cards");
    while (stmt.step()) {
        const row = stmt.getAsObject();
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${row.name}</h3>
            <svg id="barcode-${row.id}"></svg>
            <button onclick="editCard(${row.id}, '${row.name}', '${row.barcode}')">✏️ Edit</button>
            <button onclick="deleteCard(${row.id})">🗑️ Delete</button>
        `;
        cardList.appendChild(card);
        JsBarcode(`#barcode-${row.id}`, row.barcode, { format: "CODE128", displayValue: true, width: 2, height: 50 });
    }
}

function editCard(id, name, barcode) {
    document.getElementById('cardId').value = id;
    document.getElementById('cardName').value = name;
    document.getElementById('barcodeData').value = barcode;
}

function deleteCard(id) {
    if (confirm('Are you sure to delete this card?')) {
        db.run("DELETE FROM cards WHERE id = ?", [id]);
        saveDb();
        loadCards();
    }
}

document.getElementById('cardForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('cardId').value;
    const name = document.getElementById('cardName').value.trim();
    const barcode = document.getElementById('barcodeData').value.trim();

    if (name && barcode) {
        if (id) {
            db.run("UPDATE cards SET name = ?, barcode = ? WHERE id = ?", [name, barcode, id]);
        } else {
            db.run("INSERT INTO cards (name, barcode) VALUES (?, ?)", [name, barcode]);
        }
        saveDb();
        document.getElementById('cardForm').reset();
        loadCards();
    }
});

function backupToCloud() {
    const binaryArray = db.export();
    const blob = new Blob([binaryArray], { type: "application/octet-stream" });

    if (navigator.share) {
        const file = new File([blob], "cards-backup.sqlite", { type: "application/octet-stream" });
        navigator.share({
            title: "My card backup",
            text: "My card backup file",
            files: [file]
        }).then(() => {
            const now = new Date();
            localStorage.setItem('lastBackupDate', now.toISOString());
            console.log("Shared!");
        }).catch((error) => {
            console.error("Fault to Share:", error);
        });
    } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cards-backup.sqlite';
        a.click();
        URL.revokeObjectURL(url);
    }
}

function exportDb() {
    const binaryArray = db.export();
    const blob = new Blob([binaryArray], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cards-backup.sqlite';
    a.click();
    URL.revokeObjectURL(url);
}

async function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/sql-wasm.wasm` });
    db = new SQL.Database(new Uint8Array(arrayBuffer));

    saveDb();
    loadCards();
    alert('Imported!');
}

function checkBackupReminder() {
    const lastBackup = localStorage.getItem('lastBackupDate');
    const now = new Date();
    if (!lastBackup || (now - new Date(lastBackup)) > 7*24*60*60*1000) {
        if (confirm("Old Backup was over 7 days ago, backup now?")) {
            backupToCloud();
        }
    }
}

// Start
initDb();