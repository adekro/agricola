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
		piva: "1111111111",
		email: "e.ciao@gmail.com",
		phone: "334334334111",
		website: "",
		notes: "Lorem Ipsum è un testo segnaposto utilizzato nel settore della tipografia e della stampa. Lorem Ipsum è considerato il testo segnaposto standard sin dal sedicesimo secolo, quando un anonimo tipografo prese una cassetta di caratteri e li assemblò per preparare un testo campione. È sopravvissuto non solo a più di cinque secoli, ma anche al passaggio alla videoimpaginazione, pervenendoci sostanzialmente inalterato. Fu reso popolare, negli anni ’60, con la diffusione dei fogli di caratteri trasferibili “Letraset”, che contenevano passaggi del Lorem Ipsum, e più recentemente da so",
		id: 1,
	},
	{
		name: "Azienda grande SRL",
		piva: "2133221123",
		email: "gfgfgf@83838.com",
		phone: "",
		website: "https://ciaociao.it",
		notes: "Lorem Ipsum è un testo segnaposto utilizzato nel settore della tipografia e della stampa. Lorem Ipsum è considerato il testo segnaposto standard sin dal sedicesimo secolo, quando un anonimo tipografo prese una cassetta di caratteri e li assemblò per preparare un testo campione. È sopravvissuto non solo a più di cinque secoli, ma anche al passaggio alla videoimpaginazione, pervenendoci sostanzialmente inalterato. Fu reso popolare, negli anni ’60, con la diffusione dei fogli di caratteri trasferibili “Letraset”, che contenevano passaggi del Lorem Ipsum, e più recentemente da software di impaginazione come Aldus PageMaker, che includeva versioni del Lorem Ipsum.",
		id: 2,
	},
	{
		name: "Non solo Menta",
		piva: "55555555550",
		email: "",
		phone: "",
		website: "",
		notes: "This is a very ugly field!!!",
		id: 3,
	},
];
