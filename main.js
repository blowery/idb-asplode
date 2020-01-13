let running = false;
let db = null;
let itemsPut = 0;
let idb = window.indexedDB;

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

    if (itemsPut && itemsPut % 25 === 0) {
      // reset the db
      console.warn('resetting db');
      /*running = false;
      itemsPut++;
      db && db.close();
      let resetRequest = idb.deleteDatabase( 'test-test' );
      resetRequest.onsuccess = run;
      */
      let t = db.transaction("o-store", "readwrite");
      t.objectStore('o-store').clear();
      t.oncomplete = evt => console.log('clear complete', evt, t);
      t.onerror = evt => console.log('clear error', evt, t);
      t.onabort = evt => console.log('clear aborted', evt, t);
      //itemsPut++;
      //setTimeout(() => insertInterval(db), 100)
      //return;
    }

    let t = db.transaction("o-store", "readwrite");
    t.oncomplete = evt => console.log('transaction complete', evt, t);
    t.onerror = evt => console.log('transaction error', evt, t);
    t.onabort = evt => console.log('transaction aborted', evt, t);

    let o = t.objectStore('o-store');

    if (itemsPut && itemsPut % 6 === 0) {
      t.abort();
      itemsPut++;
      insertInterval(db);
      return;
    }
    let r = o.put(generateItem(), 'item');

    //log( 'adding item' );
    r.onsuccess = evt => {
      console.log('item added', evt, r);
      itemsPut++;
      updateCount();
      setTimeout(() => insertInterval(db), 100);
    };
    r.onerror = evt => console.error('put error', evt, r);
  }

  log('opening database');
  let openReq = idb.open('test-test', 2);
  openReq.onerror = function dbOpenError(evt) {
    console.error('db open error', evt);
    log('error loading database');
  }
  openReq.onsuccess = function dbOpenSuccess(evt) {
    log('database opened');
    console.log('db open', evt);
    db = openReq.result;

    db.onerror = errEvt => {
      console.error('db error', errEvt);
      log('error!');
      if (errEvt.target.error.name === 'QuotaExceededError') {
        log('exceeded quota, recreating db');
        console.log('deleting db');
        let delReq = idb.deleteDatabase('test-test');
        delReq.onsuccess = () => {
          console.log('db deleted, recreating');
          run();
        };
        delReq.onerror = ohno => {
          console.error('could not recreate db', ohno);
        }
      }
    }

    db.onclose = closeEvt => console.log('db closed', evt);

    db.onversionchange = versionChangeEvent => {
      log('db version change, reopening');
      console.log('versionChange', versionChangeEvent);

      running = false;
      db.close();
      db = null;
      if (versionChangeEvent.newVersion === null) {
        // the database was deleted
        console.log('db is being deleted');
      } else {
        console.log('db was upgraded to ', versionChangeEvent.newVersion);
      }
    }

    insertInterval(db);
  }

  openReq.onupgradeneeded = function dbUpgrade(evt) {
    let db = evt.target.result;
    db.createObjectStore('o-store');
    log('object store created');
    console.log('upgrading to v2', evt);
  }
};

function stop() {
  running = false;
  if (db) {
    db.close();
    log('db closed');
  }
}

function deleteDb() {
  console.log('deleting database');
  const delRequest = window.indexedDB.deleteDatabase('test-test');
  delRequest.onsuccess = event => {
    console.log('deleted db', event);

  }
  delRequest.onerror = event => console.log('error deleting', event);
}

function changeVersion() {
  console.log('upgrading database');
  let openReq = window.indexedDB.open('test-test', 3);
  openReq.onupgradeneeded = event => console.log('upgrading to 3', event);
  openReq.onsuccess = event => {
    console.log('upgrade finished', event);
    openReq.result.onversionchange = evt => {
      openReq.result.close();
    }
  }
  openReq.onerror = event => console.log('error upgrading', event);
}