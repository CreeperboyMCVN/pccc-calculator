const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('docAPI', {
  // Load the bundled JSON data from the document
  loadDocumentData: () => ipcRenderer.invoke('load-document-data'),
  // Re-parse the original .docx file via Python
  parseDocx: () => ipcRenderer.invoke('parse-docx'),
  // Render the .docx file as HTML with highlighted values
  renderDocx: () => ipcRenderer.invoke('render-docx'),
  // Show save dialog and export .docx
  showSaveDialog: (defaultName) => ipcRenderer.invoke('save-dialog', defaultName),
  exportDocx: (data) => ipcRenderer.invoke('export-docx', data),
});

contextBridge.exposeInMainWorld('appVersion', '1.0.1');
