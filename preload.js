const { contextBridge } = require('electron');

// Expose nothing to renderer — all calculations are done in the renderer
// This preload exists for security best practices
contextBridge.exposeInMainWorld('appVersion', '1.0.0');
