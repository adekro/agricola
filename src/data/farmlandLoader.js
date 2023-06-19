import { postData } from "../lib/lib";

export default (() => {
  const localStorageKeyName = "farmlands";
  const getItems = () => {
    return JSON.parse(localStorage.getItem(localStorageKeyName) ?? null);
  };
  const storeItems = (farmlands) => {
    localStorage.setItem(localStorageKeyName, JSON.stringify(farmlands));
  };
  const init = () => {
    /*   const response = fetch(`${process.env.REACT_APP_SERVERAPI}/farmlands.json`);
    response.then((data) => {
      storeItems(data); s
    }); */
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
    type: "Vite",
    area: 137,
    perimeter: 15,
    notes: "This is a very ugly field!!!",
    location: "",
    ownerDisplayName: "Aienda viti-vinicola San Pietro SRL",
    ownerId: 2,
    id: 0,
    landRegistryData: {},
    coordinates: [
      [9.120227123248291, 45.24057417808905],
      [9.12099959944458, 45.23776432577756],
      [9.124218250262452, 45.23809668114612],
      [9.123402858721922, 45.24105757953103],
      [9.120227123248291, 45.24057417808905],
    ],
  },
  {
    type: "Barbabietole da zucchero",
    area: 234,
    perimeter: 78,
    notes: "This is a very ugly field!!!",
    location: "",
    ownerDisplayName: "Azienda agricola La Delizia",
    ownerId: 1,
    id: 1,
    landRegistryData: {},
    coordinates: [
      [9.186296163845146, 45.21297869929745],
      [9.18736940954059, 45.211440732075374],
      [9.188467327550873, 45.21155369153507],
      [9.189195160838588, 45.21191863594851],
      [9.18804789819863, 45.21356085682979],
      [9.186296163845146, 45.21297869929745],
    ],
  },
  {
    type: "Girasoli",
    area: 98,
    perimeter: 31,
    notes: "This is a very ugly field!!!",
    location: "",
    ownerDisplayName: "Non solo girasoli SPA",
    ownerId: 3,
    id: 2,
    landRegistryData: {},
    coordinates: [
      [9.000799172489794, 44.990242099534214],
      [9.001498566302361, 44.98934184635283],
      [9.002704706530015, 44.98975643839037],
      [9.001992748756741, 44.990692220822524],
      [9.000799172489794, 44.990242099534214],
    ],
  },
];
