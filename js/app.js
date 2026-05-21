/**
 * Maze Builder - Application Entry Point
 * Initializes the AppController which wires all components together.
 */

import { AppController } from './controllers/app-controller.js';

let app;

function init() {
  app = new AppController();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
