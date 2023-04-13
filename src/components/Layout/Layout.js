import React, { useState } from "react";
import classes from "./Layout.module.css";
import Side from "../Side/Side";
import useFarmlands from "../../hooks/useFarmlands";
import useCompanies from "../../hooks/useCompanies";
import FarmlandsList from "../FarmlandsList/FarmlandsList";
import CompaniesList from "../CompaniesList/CompaniesList";

const Layout = () => {
	const { farmlands } = useFarmlands();
	const { companies } = useCompanies();
	const [selectedList, setSelectedList] = useState("farmlands");
	const handlerSelectSide = (target) => {
		setSelectedList(() => {
			return target;
		});
	};

	return (
		<React.Fragment>
			<header>header</header>
			<div className={classes.layoutBody}>
				<div className={classes.layoutSide}>
					<Side onSelect={handlerSelectSide} />
				</div>
				<div className={classes.layoutContent}>
					{selectedList === "farmlands" && (
						<FarmlandsList farmlands={farmlands} />
					)}
					{selectedList === "companies" && (
						<CompaniesList companies={companies} />
					)}
				</div>
			</div>
		</React.Fragment>
	);
};
export default Layout;
