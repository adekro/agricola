export default (() => {
  const localStorageKeyName = "farmlands";
  const getItems = () => {
    return JSON.parse(localStorage.getItem(localStorageKeyName) ?? {});
  };
  const storeItems = (farmlands) => {
    localStorage.setItem(localStorageKeyName, JSON.stringify(farmlands));
  };
  const init = () => {
    storeItems(mockData);
  };

  return {
    getItems,
    storeItems,
    init,
  };
})();

const mockData = [
  {
    type: "Erbacce",
    area: 137,
    perimiter: 15,
    notes: "This is a very ugly field!!!",
    coords: {
      lat: "",
      lng: "",
    },
    ownerDisplayName: "Signor Giacomo",
    ownerId: 2,
    id: 0,
  },
  {
    type: "Grano",
    area: 234,
    perimiter: 78,
    notes: "This is a very ugly field!!!",
    coords: {
      lat: "",
      lng: "",
    },
    ownerDisplayName: "Signor Gianni",
    ownerId: 1,
    id: 1,
  },
  {
    type: "Menta",
    area: 98,
    perimiter: 31,
    notes: "This is a very ugly field!!!",
    coords: {
      lat: "",
      lng: "",
    },
    ownerDisplayName: "Azienda grande SRL",
    ownerId: 3,
    id: 2,
  },
];
