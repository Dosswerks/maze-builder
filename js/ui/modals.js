/**
 * Modal Dialog System
 * Reusable modals with focus trapping and keyboard handling.
 */

const overlay = () => document.getElementById('modal-overlay');
const content = () => document.getElementById('modal-content');

let previousFocus = null;
let onCloseCallback = null;

/**
 * Shows a modal with the given HTML content.
 * @param {string} html - Modal inner HTML
 * @param {object} [options]
 * @param {Function} [options.onClose] - Called when modal is dismissed
 */
export function showModal(html, options = {}) {
  previousFocus = document.activeElement;
  onCloseCallback = options.onClose || null;

  content().innerHTML = html;
  overlay().hidden = false;

  // Focus first focusable element
  const focusable = content().querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length > 0) {
    focusable[0].focus();
  }

  // Trap focus and handle Escape
  overlay().addEventListener('keydown', handleModalKeydown);
  overlay().addEventListener('click', handleOverlayClick);
}

/**
 * Closes the currently open modal.
 * @param {*} [result] - Optional result passed to onClose callback
 */
export function closeModal(result) {
  overlay().hidden = true;
  overlay().removeEventListener('keydown', handleModalKeydown);
  overlay().removeEventListener('click', handleOverlayClick);
  content().innerHTML = '';

  if (previousFocus) {
    previousFocus.focus();
    previousFocus = null;
  }

  if (onCloseCallback) {
    onCloseCallback(result);
    onCloseCallback = null;
  }
}

function handleModalKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeModal('cancel');
    return;
  }

  // Focus trapping
  if (e.key === 'Tab') {
    const focusable = content().querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

function handleOverlayClick(e) {
  if (e.target === overlay()) {
    closeModal('cancel');
  }
}

/**
 * Shows an ASCII export preview modal.
 * @param {string} asciiContent - The ASCII maze text
 * @returns {Promise<boolean>} true if user confirms export
 */
export function showExportPreview(asciiContent) {
  return new Promise((resolve) => {
    const escaped = asciiContent.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const html = `
      <h2 class="modal-title">Export Preview</h2>
      <div class="modal-preview">${escaped}</div>
      <div class="modal-actions">
        <button class="secondary-btn" id="modal-cancel">Cancel</button>
        <button class="primary-btn" id="modal-confirm">Export</button>
      </div>
    `;
    showModal(html, {
      onClose: (result) => resolve(result === 'confirm'),
    });
    content().querySelector('#modal-cancel').addEventListener('click', () => closeModal('cancel'));
    content().querySelector('#modal-confirm').addEventListener('click', () => closeModal('confirm'));
  });
}

/**
 * Shows a confirmation dialog (e.g., unsaved changes).
 * @param {string} message - Warning message
 * @param {object} [options]
 * @param {boolean} [options.showSave=true] - Show Save button
 * @returns {Promise<'save'|'discard'|'cancel'>}
 */
export function showConfirmation(message, options = {}) {
  const showSave = options.showSave !== false;
  return new Promise((resolve) => {
    const html = `
      <h2 class="modal-title">Unsaved Changes</h2>
      <div class="modal-body">${message}</div>
      <div class="modal-actions">
        <button class="secondary-btn" id="modal-cancel">Cancel</button>
        <button class="secondary-btn" id="modal-discard" style="color: var(--color-danger)">Discard</button>
        ${showSave ? '<button class="primary-btn" id="modal-save">Save</button>' : ''}
      </div>
    `;
    showModal(html, {
      onClose: (result) => resolve(result || 'cancel'),
    });
    content().querySelector('#modal-cancel').addEventListener('click', () => closeModal('cancel'));
    content().querySelector('#modal-discard').addEventListener('click', () => closeModal('discard'));
    if (showSave) {
      content().querySelector('#modal-save').addEventListener('click', () => closeModal('save'));
    }
  });
}

/**
 * Shows an error modal.
 * @param {string} title - Error title
 * @param {string} message - Error details
 * @param {object} [options]
 * @param {boolean} [options.showRetry=false] - Show Retry button
 * @returns {Promise<'ok'|'retry'>}
 */
export function showError(title, message, options = {}) {
  return new Promise((resolve) => {
    const html = `
      <h2 class="modal-title" style="color: var(--color-danger)">${title}</h2>
      <div class="modal-body">${message}</div>
      <div class="modal-actions">
        ${options.showRetry ? '<button class="secondary-btn" id="modal-retry">Retry</button>' : ''}
        <button class="primary-btn" id="modal-ok">OK</button>
      </div>
    `;
    showModal(html, {
      onClose: (result) => resolve(result || 'ok'),
    });
    content().querySelector('#modal-ok').addEventListener('click', () => closeModal('ok'));
    if (options.showRetry) {
      content().querySelector('#modal-retry').addEventListener('click', () => closeModal('retry'));
    }
  });
}

/**
 * Shows a type selection modal (for ambiguous imports).
 * @returns {Promise<'pacman'|'classic'|null>}
 */
export function showTypeSelection() {
  return new Promise((resolve) => {
    const html = `
      <h2 class="modal-title">Select Maze Type</h2>
      <div class="modal-body">The imported file does not specify a maze type. Please select one:</div>
      <div class="radio-group" style="margin-bottom: var(--space-lg)">
        <label class="radio-label">
          <input type="radio" name="import-type" value="pacman"> Pac-Man
        </label>
        <label class="radio-label">
          <input type="radio" name="import-type" value="classic"> Classic
        </label>
      </div>
      <div class="modal-actions">
        <button class="secondary-btn" id="modal-cancel">Cancel</button>
        <button class="primary-btn" id="modal-confirm">Confirm</button>
      </div>
    `;
    showModal(html, {
      onClose: (result) => resolve(result === 'cancel' ? null : result),
    });
    content().querySelector('#modal-cancel').addEventListener('click', () => closeModal('cancel'));
    content().querySelector('#modal-confirm').addEventListener('click', () => {
      const selected = content().querySelector('input[name="import-type"]:checked');
      closeModal(selected ? selected.value : 'cancel');
    });
  });
}

/**
 * Shows autosave recovery prompt.
 * @returns {Promise<boolean>} true if user wants to restore
 */
export function showRecoveryPrompt() {
  return new Promise((resolve) => {
    const html = `
      <h2 class="modal-title">Recover Unsaved Work</h2>
      <div class="modal-body">A previous session was not saved. Would you like to restore it?</div>
      <div class="modal-actions">
        <button class="secondary-btn" id="modal-discard">Discard</button>
        <button class="primary-btn" id="modal-restore">Restore</button>
      </div>
    `;
    showModal(html, {
      onClose: (result) => resolve(result === 'restore'),
    });
    content().querySelector('#modal-discard').addEventListener('click', () => closeModal('discard'));
    content().querySelector('#modal-restore').addEventListener('click', () => closeModal('restore'));
  });
}
