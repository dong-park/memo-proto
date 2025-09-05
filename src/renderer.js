(() => {
  const editor = document.getElementById('editor');
  const toolbar = document.getElementById('toolbar');
  const status = document.getElementById('status');
  const btnNew = document.getElementById('btn-new');
  const btnOpen = document.getElementById('btn-open');
  const btnSave = document.getElementById('btn-save');
  const btnSaveAs = document.getElementById('btn-saveas');
  const winClose = document.getElementById('win-close');
  const winMin = document.getElementById('win-min');
  const winMax = document.getElementById('win-max');

  let currentPath = null;
  let dirty = false;

  const setStatus = () => {
    const name = currentPath ? currentPath : 'Untitled';
    const dirtyMark = dirty ? ' • Modified' : '';
    status.textContent = `${name}${dirtyMark}`;
    document.title = `${currentPath ? name.split(/[\\/]/).pop() : 'Untitled'}${dirty ? ' *' : ''} — Plain Text`;
  };

  const loadDoc = ({ content, path }) => {
    editor.value = content || '';
    currentPath = path || null;
    dirty = false;
    setStatus();
  };

  editor.addEventListener('input', () => {
    dirty = true;
    setStatus();
  });

  async function doNew() {
    const res = await window.api.newFile();
    if (res) loadDoc(res);
  }

  async function doOpen() {
    const res = await window.api.openFile();
    if (res) loadDoc(res);
  }

  async function doSave() {
    const content = editor.value;
    const res = await window.api.saveFile(content);
    if (res) {
      if (res.path) currentPath = res.path;
      dirty = false;
      setStatus();
    }
  }

  async function doSaveAs() {
    const content = editor.value;
    const res = await window.api.saveFileAs(content);
    if (res) {
      if (res.path) currentPath = res.path;
      dirty = false;
      setStatus();
    }
  }

  // Toolbar buttons
  btnNew.addEventListener('click', doNew);
  btnOpen.addEventListener('click', doOpen);
  btnSave.addEventListener('click', doSave);
  btnSaveAs.addEventListener('click', doSaveAs);

  // Window controls
  winClose.addEventListener('click', () => window.api.windowControls.close());
  winMin.addEventListener('click', () => window.api.windowControls.minimize());
  winMax.addEventListener('click', () => window.api.windowControls.maximizeOrRestore());

  // Reflect maximize state (optionally could change style or tooltip)
  window.api.windowControls.onState((state) => {
    if (state?.maximized) {
      winMax.title = 'Restore';
    } else {
      winMax.title = 'Maximize';
    }
  });

  // Menu events
  window.api.onMenu((action) => {
    switch (action) {
      case 'menu:new':
        doNew();
        break;
      case 'menu:open':
        doOpen();
        break;
      case 'menu:save':
        doSave();
        break;
      case 'menu:saveAs':
        doSaveAs();
        break;
    }
  });

  // Initialize new doc
  doNew();

  // Expand hover area: show toolbar when near top (e.g., 32px)
  const REVEAL_THRESHOLD = 32;
  window.addEventListener('mousemove', (e) => {
    if (e.clientY <= REVEAL_THRESHOLD) {
      document.body.classList.add('toolbar-visible');
    } else if (!toolbar.matches(':hover')) {
      document.body.classList.remove('toolbar-visible');
    }
  });
  toolbar.addEventListener('mouseenter', () => {
    document.body.classList.add('toolbar-visible');
  });
  toolbar.addEventListener('mouseleave', () => {
    document.body.classList.remove('toolbar-visible');
  });
})();
