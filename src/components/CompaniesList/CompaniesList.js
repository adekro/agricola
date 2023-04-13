import CompanyCard from "./CompanyCard/CompanyCard";

const CompaniesList = ({ companies }) => {
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
				/>
			))}
		</div>
	);
};

export default CompaniesList;
