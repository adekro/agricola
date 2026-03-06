export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("FitosanitariDB", 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("products")) {
        db.createObjectStore("products", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata", { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveProducts = async (products, fileName) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["products", "metadata"], "readwrite");
    const productStore = transaction.objectStore("products");
    const metadataStore = transaction.objectStore("metadata");

    productStore.clear();
    products.forEach((p) => productStore.add(p));
    metadataStore.put({ key: "lastFile", value: fileName, date: new Date().toISOString() });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const getProducts = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("products", "readonly");
    const store = transaction.objectStore("products");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getLastUpdated = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("metadata", "readonly");
    const store = transaction.objectStore("metadata");
    const request = store.get("lastFile");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};
