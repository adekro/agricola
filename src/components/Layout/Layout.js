import React from "react";
import classes from "./Layout.module.css";

const Layout = () =>{

    return(
        <React.Fragment>
            <header>
            header
            </header>
            <div className={classes.layoutBody}>
                <div className={classes.layoutSide}>side</div>
                <div className={classes.layoutContent}>content</div>
            </div>

                </React.Fragment>
    );
}
export default Layout;