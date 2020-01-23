import './code-example.js';

const menuButton = document.querySelector('#menu-button');

if (menuButton != null) {
  const drawer = document.querySelector('#drawer');

  menuButton.addEventListener('click', (event) => {
    document.body.classList.add('show-drawer');
    event.stopImmediatePropagation();
  });

  document.body.addEventListener('click', (event: MouseEvent) => {
    if (document.body.classList.contains('show-drawer') && event.composedPath().indexOf(drawer as EventTarget) === -1) {
      document.body.classList.remove('show-drawer');
    }
  });

  window.addEventListener('hashchange', () => {
    document.body.classList.remove('show-drawer');
  });
}
