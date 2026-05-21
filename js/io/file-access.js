/**
 * File Access Wrapper
 * Abstracts File System Access API with fallback to Blob download / input upload.
 */

/**
 * Saves content to a file using File System Access API or fallback download.
 * @param {string} content - File content to save
 * @param {string} suggestedName - Suggested filename
 * @param {Array} types - File type filters for the picker
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function saveFile(content, suggestedName, types) {
  try {
    if ('showSaveFilePicker' in window) {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types,
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return { success: true };
    } else {
      downloadBlob(content, suggestedName);
      return { success: true };
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'cancelled' };
    }
    return { success: false, error: err.message || 'Unknown file save error' };
  }
}

/**
 * Opens a file using File System Access API or fallback input element.
 * @param {Array} types - File type filters for the picker
 * @returns {Promise<{ success: boolean, content?: string, name?: string, error?: string }>}
 */
export async function openFile(types) {
  try {
    if ('showOpenFilePicker' in window) {
      const [handle] = await window.showOpenFilePicker({ types });
      const file = await handle.getFile();
      const content = await file.text();
      return { success: true, content, name: file.name };
    } else {
      return await uploadViaInput(types);
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'cancelled' };
    }
    return { success: false, error: err.message || 'Unknown file open error' };
  }
}

/**
 * Fallback: triggers a Blob download.
 * @param {string} content - File content
 * @param {string} filename - Download filename
 */
function downloadBlob(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);
}

/**
 * Fallback: opens a file via hidden input[type=file].
 * @param {Array} types - File type filters (used for accept attribute)
 * @returns {Promise<{ success: boolean, content?: string, name?: string, error?: string }>}
 */
function uploadViaInput(types) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';

    // Build accept string from types
    if (types && types.length > 0) {
      const extensions = types.flatMap(
        (t) => t.accept ? Object.values(t.accept).flat() : []
      );
      input.accept = extensions.join(',');
    }

    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) {
        resolve({ success: false, error: 'cancelled' });
      } else {
        try {
          const content = await file.text();
          resolve({ success: true, content, name: file.name });
        } catch (err) {
          resolve({ success: false, error: err.message });
        }
      }
      document.body.removeChild(input);
    });

    input.addEventListener('cancel', () => {
      resolve({ success: false, error: 'cancelled' });
      document.body.removeChild(input);
    });

    input.click();
  });
}

/** File type definitions for maze files */
export const FILE_TYPES = {
  ascii: [
    {
      description: 'Maze ASCII File',
      accept: { 'text/plain': ['.txt'] },
    },
  ],
  project: [
    {
      description: 'Maze Project File',
      accept: { 'application/json': ['.json'] },
    },
  ],
};
