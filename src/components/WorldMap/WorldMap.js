import React, { useEffect, useRef } from "react";
import BingMaps from "ol/source/BingMaps";
import Map from "ol/Map.js";
import TileLayer from "ol/layer/Tile.js";
import View from "ol/View.js";
import classes from "./WordMap.module.css";

const styles = [
	"RoadOnDemand",
	"Aerial",
	"AerialWithLabelsOnDemand",
	"CanvasDark",
	"OrdnanceSurvey",
];
const layers = [];
const WorldMap = () => {
	const mapRef = useRef(null);

	const initMap = () => {
		layers.push(
			new TileLayer({
				visible: true,
				preload: Infinity,
				source: new BingMaps({
					key: "Ahuf0ANrUzpA6kcYt7ZiYIIu5DR9oF6RG62SautIoD2UKxAmbxhPn--scNKOS6Vm",
					imagerySet: styles[2],
					// use maxZoom 19 to see stretched tiles instead of the BingMaps
					// "no photos at this zoom level" tiles
					// maxZoom: 19
				}),
			})
		);

		mapRef.current.innerHTML = "<div id='map' class=" + classes.map + "></div>";

		const map = new Map({
			layers: layers,
			target: "map",
			view: new View({
				center: [-6655.5402445057125, 6709968.258934638],
				zoom: 13,
			}),
		});
	};

	useEffect(() => {
		initMap();
	});

	return <div id="genMap" ref={mapRef} className={classes.genMap}></div>;
};

export default WorldMap;
