import CompanyCard from "./CompanyCard/CompanyCard";

const CompaniesList = ({ companies, onClick }) => {
	const onViewHandler = (id) => {
		onClick(id);
	};
	return (
		<div>
			{companies.map((company) => (
				<CompanyCard
					phone={company.phone}
					email={company.email}
					piva={company.piva}
					website={company.website}
					notes={company.notes}
					name={company.name}
					key={company.id}
					id={company.id}
					onView={onViewHandler}
				/>
			))}
		</div>
	);
};

export default CompaniesList;
