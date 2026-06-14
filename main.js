const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const mammoth = require('mammoth');

// Path to bundled JSON data
const DATA_JSON_PATH = path.join(__dirname, '_doc', 'data.json');
const DOCX_PATH = path.join(__dirname, '_doc', 'long.docx');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'PCCC Calculator - Tính toán chữa cháy',
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

// IPC: Load bundled JSON data
ipcMain.handle('load-document-data', async () => {
  try {
    const raw = fs.readFileSync(DATA_JSON_PATH, 'utf-8');
    return { success: true, data: JSON.parse(raw) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Re-parse the original .docx via Python
ipcMain.handle('parse-docx', async () => {
  return new Promise((resolve) => {
    const pythonScript = `
import docx, json, re, sys
try:
    doc = docx.Document(${JSON.stringify(DOCX_PATH)})
    full_text = '\\n'.join([p.text for p in doc.paragraphs])

    def find_num(pattern, text, default=0):
        m = re.search(pattern, text)
        return float(m.group(1).replace(',', '.')) if m else default

    params = {
        'tbc': find_num(r'Tbc:\\s*(\\d+[.,]?\\d*)', full_text, 3),
        'tcb': find_num(r'Tcb\\s*=\\s*(\\d+[.,]?\\d*)', full_text, 2),
        'ttk': find_num(r'Ttk\\s*=\\s*(\\d+[.,]?\\d*)', full_text, 2),
        'distL': find_num(r'L\\s*=\\s*(\\d+[.,]?\\d*)\\s*km', full_text, 1.3),
        'vxe': find_num(r'Vxe\\s*=\\s*(\\d+[.,]?\\d*)\\s*km/h', full_text, 60),
        'vl': find_num(r'Vl\\s*=\\s*(\\d+[.,]?\\d*)\\s*m/ph', full_text, 1.2),
        'fdc': find_num(r'Diện tích đám cháy khoảng\\s*(\\d+[.,]?\\d*)\\s*m', full_text, 80),
        'ict': find_num(r'ict\\s*=\\s*(\\d+[.,]?\\d*)\\s*l/s', full_text, 0.1),
        'ql': find_num(r'ql\\s*=\\s*(\\d+[.,]?\\d*)\\s*l/s', full_text, 3.5),
        'nlPerTruck': find_num(r'triển khai tối đa\\s*(\\d+)\\s*lăng', full_text, 4),
    }
    print(json.dumps(params))
except Exception as e:
    print(json.dumps({'error': str(e)}), file=sys.stderr)
    sys.exit(1)
`;
    execFile('python3', ['-c', pythonScript], { timeout: 10000 }, (err, stdout, stderr) => {
      if (err) {
        // Fallback to bundled JSON
        try {
          const raw = fs.readFileSync(DATA_JSON_PATH, 'utf-8');
          resolve({ success: true, data: JSON.parse(raw), fallback: true, error: stderr || err.message });
        } catch (e2) {
          resolve({ success: false, error: stderr || err.message });
        }
      } else {
        try {
          resolve({ success: true, params: JSON.parse(stdout) });
        } catch (e3) {
          resolve({ success: false, error: 'Failed to parse Python output: ' + stdout });
        }
      }
    });
  });
});

// IPC: Render .docx to HTML with highlighted key values
ipcMain.handle('render-docx', async () => {
  try {
    const result = await mammoth.convertToHtml({ path: DOCX_PATH });
    let html = result.value;

    // Highlight key numeric values matched from the document
    const highlights = [
      // Time values
      { regex: /(08h30)/g, cls: 'hl-time' },
      { regex: /(03)\s*phút/g, cls: 'hl-param' },
      { regex: /(2)\s*phút/g, cls: 'hl-param' },
      { regex: /(8[,.]3)\s*phút/g, cls: 'hl-result' },
      // Distance & speed
      { regex: /(1[,.]3)\s*km/g, cls: 'hl-param' },
      { regex: /(60)\s*km\/h/g, cls: 'hl-param' },
      { regex: /(1[,.]2)\s*m\/ph/g, cls: 'hl-param' },
      // Area
      { regex: /(80)\s*m<sup>2<\/sup>/g, cls: 'hl-param' },
      { regex: /(80)\s*m²/g, cls: 'hl-param' },
      { regex: /(80)m2/g, cls: 'hl-param' },
      // Intensity & flow
      { regex: /(0[,.]1)\s*l\/s\.m<sup>2<\/sup>/g, cls: 'hl-param' },
      { regex: /(0[,.]1)\s*l\/s\.m²/g, cls: 'hl-param' },
      { regex: /(3[,.]5)\s*l\/s/g, cls: 'hl-param' },
      { regex: /(8)\s*l\/s/g, cls: 'hl-result' },
      { regex: /(2)\s*l\/s/g, cls: 'hl-result' },
      // Flame radius
      { regex: /(15[,.]96)\s*m/g, cls: 'hl-result' },
      // Nozzles
      { regex: /(03)\s*lăng\s*B/g, cls: 'hl-result' },
      { regex: /(04)\s*lăng\s*B/g, cls: 'hl-param' },
      { regex: /(01)\s*lăng\s*B/g, cls: 'hl-result' },
      { regex: /(4)\s*lăng\s*B/g, cls: 'hl-result' },
      // Vehicles
      { regex: /(01)\s*xe/g, cls: 'hl-result' },
      { regex: /(0[,.]75)/g, cls: 'hl-calc' },
      { regex: /(0[,.]5)/g, cls: 'hl-calc' },
      { regex: /(2[,.]28)/g, cls: 'hl-calc' },
      { regex: /(0[,.]6)/g, cls: 'hl-calc' },
      { regex: /(0[,.]25)/g, cls: 'hl-calc' },
    ];

    for (const h of highlights) {
      html = html.replace(h.regex, function(match) {
        return '<mark class="' + h.cls + '">' + match + '</mark>';
      });
    }

    return { success: true, html: html, messages: result.messages };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Show save dialog and return chosen path
ipcMain.handle('save-dialog', async (event, defaultName) => {
  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showSaveDialog(win, {
    title: 'Xuất báo cáo PCCC',
    defaultPath: defaultName || 'Bao_cao_PCCC.docx',
    filters: [
      { name: 'Word Documents', extensions: ['docx'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  return { canceled: result.canceled, filePath: result.filePath };
});

// IPC: Export .docx report using Python
ipcMain.handle('export-docx', async (event, data) => {
  return new Promise((resolve) => {
    const exportScript = path.join(__dirname, '_doc', 'export.py');
    const input = JSON.stringify(data);

    const child = execFile(
      'python3',
      [exportScript],
      { timeout: 30000, maxBuffer: 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          resolve({ success: false, error: stderr || err.message });
        } else {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (e) {
            resolve({ success: false, error: 'Invalid Python output: ' + stdout });
          }
        }
      }
    );

    // Write JSON to stdin
    child.stdin.write(input);
    child.stdin.end();
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
