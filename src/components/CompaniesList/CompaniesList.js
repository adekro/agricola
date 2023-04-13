import CompaniesCard from "./CompaniesCard/CompaniesCard";

const CompaniesList = ({ companies }) => {
	return (
		<div>
			{companies.map((company) => (
				<CompaniesCard
					phone={company.phone}
					email={company.email}
					piva={company.piva}
					website={company.website}
					notes={company.notes}
					name={company.name}
					key={company.id}
				/>
			))}
		</div>
	);
};

export default CompaniesList;
