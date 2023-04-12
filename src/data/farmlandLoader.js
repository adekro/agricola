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
    perimeter: 15,
    notes: "This is a very ugly field!!!",
    coords: {
      lat: "",
      lng: "",
    },
    location: 'Somewhere near Voghera',
    ownerDisplayName: "Signor Giacomo",
    ownerId: 2,
    id: 0,
    landRegistryData: {},
  },
  {
    type: "Barbabietole da zucchero",
    area: 234,
    perimeter: 78,
    notes: "This is a very ugly field!!!",
    coords: {
      lat: "",
      lng: "",
    },
    location: 'Somewhere near Voghera',
    ownerDisplayName: "Signor Gianni",
    ownerId: 1,
    id: 1,
    landRegistryData: {},
  },
  {
    type: "Menta",
    area: 98,
    perimeter: 31,
    notes: "This is a very ugly field!!!",
    coords: {
      lat: "",
      lng: "",
    },
    location: 'Somewhere near Voghera',
    ownerDisplayName: "Azienda grande SRL",
    ownerId: 3,
    id: 2,
    landRegistryData: {},
  },
];
