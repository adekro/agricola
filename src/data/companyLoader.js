export default (() => {
	const localStorageKeyName = "companies";
	const getItems = () => {
		return JSON.parse(localStorage.getItem(localStorageKeyName) ?? {});
	};
	const storeItems = (companies) => {
		localStorage.setItem(localStorageKeyName, JSON.stringify(companies));
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
		name: "Signor Gianni S.P.A.",
		piva: "",
		email: "",
		phone: "",
		website: "",
		notes: "This is a very ugly field!!!",
		id: 1,
	},
	{
		name: "Azienda grande SRL",
		piva: "",
		email: "",
		phone: "",
		website: "",
		notes: "This is a very ugly field!!!",
		id: 2,
	},
	{
		name: "Non solo Menta",
		piva: "",
		email: "",
		phone: "",
		website: "",
		notes: "This is a very ugly field!!!",
		id: 3,
	},
];
