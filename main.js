let running = false;
let db = null;
let itemsPut = 0;

function log(s) {
  let l = document.getElementById('log');
  l.innerText = s + '\n' + l.innerText;
}

function updateCount() {
  document.getElementById('count').innerText = itemsPut;
}

function generateItem() {
  return JSON.stringify((new Array(10 * 1024 * 1024)).fill(itemsPut));
}

function run() {
  running = true;

  function insertInterval(db) {
    if (!running) {
      return;
    }
    let t = db.transaction("o-store", "readwrite");
    let o = t.objectStore('o-store');
    let r = o.put(generateItem(), 'item');
    //log( 'adding item' );
    r.onsuccess = evt => {
      //log( 'item added' );
      itemsPut++;
      updateCount();
      setTimeout(() => insertInterval(db), 200);
    };
    r.onerror = evt => console.error(evt);
  }
  // let's spin up a database...
  let idb = window.indexedDB;

  log( 'opening database' );
  let openReq = idb.open('test-test', 2);
  openReq.onerror = function dbOpenError(evt) {
    log('error loading database');
  }
  openReq.onsuccess = function dbOpenSuccess(evt) {
    log('database opened');
    db = openReq.result;
    db.onerror = errEvt => {
      console.error( 'error', errEvt );
      log( 'error!' );
      if ( errEvt.target.error.name === 'QuotaExceededError' ) {
        log( 'exceeded quota, recreating db' );
        console.log( 'deleting db' );
        let delReq = idb.deleteDatabase( 'test-test' );
        delReq.onsuccess = () => {
          console.log( 'db deleted, recreating' );
          run();
        };
        delReq.onerror = ohno => {
          console.error( 'could not recreate db', ohno );
        }
      }
    }
    db.onversionchange = versionChangeEvent => {
      log( 'db version change, reopening' );
      console.error( 'versionChange', versionChangeEvent );
      db.close();
      db = null;
    }
    insertInterval(db);
  }
  openReq.onupgradeneeded = function dbUpgrade(evt) {
    let db = evt.target.result;
    db.createObjectStore('o-store');
    log('object store created');
  }
};

function stop() {
  running = false;
  if (db) {
    db.close();
    log('db closed');
  }
}