// =========================================================================
// ☁️ RECURSIVE GOOGLE APPS SCRIPT WEB APP API FOR SOFTWHEREHUB DRIVE IMPORTER
// =========================================================================
// Copy the entire contents of this file and paste it into your Google Apps Script editor.
// (Go to script.google.com, delete everything, and paste this in).
// =========================================================================

// --- CONFIGURATION ---
const ROOT_FOLDER_ID = "17jGjCEQaxRyZmqeRi6rJnQTIW5S-9Rhf"; // Your Google Drive Root Folder ID

/**
 * Serves the list of files to the Admin Panel
 */
function doGet(e) {
  try {
    const rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
    const list = [];
    
    // Start recursive scan
    getAllFilesRecursively(rootFolder, list);
    
    // Sort files alphabetically by name
    list.sort(function(a, b) {
      return a.name.localeCompare(b.name);
    });
    
    const output = JSON.stringify({ success: true, files: list });
    
    const callback = e.parameter && e.parameter.callback;
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + output + ')')
                           .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService.createTextOutput(output)
                           .setMimeType(ContentService.MimeType.JSON)
                           .setHeader("Access-Control-Allow-Origin", "*");
    }
  } catch (error) {
    const errorOutput = JSON.stringify({ success: false, error: error.toString() });
    const callback = e.parameter && e.parameter.callback;
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + errorOutput + ')')
                           .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService.createTextOutput(errorOutput)
                           .setMimeType(ContentService.MimeType.JSON)
                           .setHeader("Access-Control-Allow-Origin", "*");
    }
  }
}

/**
 * Recursively scans a folder and its subfolders for archive/installer files
 */
function getAllFilesRecursively(folder, list) {
  const files = folder.getFiles();
  
  while (files.hasNext()) {
    const file = files.next();
    const nameLower = file.getName().toLowerCase();
    
    // Check if file is an installer or script
    const isInstaller = nameLower.endsWith(".zip") || 
                        nameLower.endsWith(".rar") || 
                        nameLower.endsWith(".dmg") || 
                        nameLower.endsWith(".exe") || 
                        nameLower.endsWith(".7z") || 
                        nameLower.endsWith(".pkg") || 
                        nameLower.endsWith(".msi") ||
                        nameLower.endsWith(".jsxbin") || 
                        nameLower.endsWith(".jsx");
    
    if (isInstaller && !nameLower.includes("thumbnail") && !nameLower.includes("cover")) {
      // Set sharing public so visitors can download it
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      list.push({
        id: file.getId(),
        name: file.getName(),
        size: formatBytes(file.getSize()),
        downloadUrl: "https://drive.google.com/uc?export=download&id=" + file.getId(),
        parentFolder: folder.getName() // Returns the name of the folder the file is in
      });
    }
  }
  
  // Recursively process subfolders
  const subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    const subfolder = subfolders.next();
    getAllFilesRecursively(subfolder, list);
  }
}

/**
 * Format bytes to readable size
 */
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
