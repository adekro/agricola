import React, { useEffect, useRef } from "react";
import OSM from "ol/source/OSM";
import { defaults as defaultControls } from "ol/control.js";
import Map from "ol/Map.js";
import { Vector as VectorSource } from "ol/source.js";
import { fromLonLat } from "ol/proj";
import TileLayer from "ol/layer/Tile.js";
import View from "ol/View.js";
import { Vector as VectorLayer } from "ol/layer.js";
import classes from "./WordMap.module.css";

import { useGeolocation } from "../../hooks/useGeolocation";
import Loader from "../UI/Loader/Loader";
import { Polygon } from "ol/geom";
import { Feature } from "ol";
import { styled } from "@mui/material";

export const DEFAULT_CENTER = [9.0953328, 45.4628246];

export const ResponsiveMap = styled("div")(({ theme }) => ({
  [theme.breakpoints.down("md")]: {
    width: "90vw;",
  },
}));

const WorldMap = ({ coordinates }) => {
  const mapRef = useRef(null);
  const { position } = useGeolocation();

  useEffect(() => {
    if (!position || !mapRef.current) {
      return;
    }

    const baseLayer = new TileLayer({
      visible: true,
      preload: Infinity,
      source: new OSM({
        attributions: "© OpenStreetMap contributors",
      }),
    });

    const transformedCoords = coordinates.map((coord) => fromLonLat(coord));
    const geometry = new Polygon([transformedCoords]);
    const polygon = new Feature({
      type: "Polygon",
      geometry: geometry,
    });

    const pointInsideTheField = geometry.getInteriorPoint();

    const polygonLayer = new VectorLayer({
      source: new VectorSource({
        features: [polygon],
      }),
      style: {
        "fill-color": "rgba(255, 255, 255, 0.2)",
        "stroke-color": "#ffcc33",
        "stroke-width": 2,
        "circle-radius": 7,
        "circle-fill-color": "#ffcc33",
      },
    });

    const map = new Map({
      layers: [baseLayer, polygonLayer],
      target: mapRef.current.id,
      view: new View({
        center: pointInsideTheField
          ? pointInsideTheField.getCoordinates()
          : fromLonLat(position),
        zoom: 15,
      }),
      controls: defaultControls({
        attribution: true,
      }),
    });

    return () => {
      map.setTarget(undefined);
    };
  }, [coordinates, position]);

  return position ? (
    <div>
      <div id="genMap" className={classes.genMap}>
        <ResponsiveMap
          id="map"
          ref={mapRef}
          className={classes.map}
        ></ResponsiveMap>
      </div>
    </div>
  ) : (
    <Loader />
  );
};

export default WorldMap;
