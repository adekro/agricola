import React, { useEffect, useRef } from "react";
import BingMaps from "ol/source/BingMaps";
import { defaults as defaultControls } from "ol/control.js";
import Map from "ol/Map.js";
import { Vector as VectorSource, OSM } from "ol/source.js";
import { fromLonLat } from "ol/proj";
import TileLayer from "ol/layer/Tile.js";
import View from "ol/View.js";
import { Vector as VectorLayer } from "ol/layer.js";
import classes from "./WordMap.module.css";

import { useGeolocation } from "../../hooks/useGeolocation";
import Loader from "../UI/Loader/Loader";
import { Polygon } from "ol/geom";
import { Feature } from "ol";

export const DEFAULT_CENTER = [9.0953328, 45.4628246];

const layers = [];

const WorldMap = ({ coordinates }) => {
  const mapRef = useRef(null);
  const { position } = useGeolocation();
  let map, source;

  const initMap = () => {
    source = new VectorSource({ wrapX: false });

    layers.push(
      new TileLayer({
        visible: true,
        preload: Infinity,
        source: new BingMaps({
          key: `${process.env.REACT_APP_MAP_KEY}`,
          imagerySet: "AerialWithLabelsOnDemand",
          // use maxZoom 19 to see stretched tiles instead of the BingMaps
          // "no photos at this zoom level" tiles
          // maxZoom: 19
        }),
      })
    );

    const transformedCoords = coordinates.map((coord) => fromLonLat(coord));

    const geometry = new Polygon([transformedCoords]);
    const polygon = new Feature({
      type: "Polygon",
      geometry: geometry,
    });

    const pointInsideTheField = geometry.getInteriorPoint();

    // Another way to draw one (or more) polygon
    // const geojsonObject = {
    //   type: "FeatureCollection",
    //   features: [
    //     {
    //       type: "Feature",
    //       geometry: {
    //         type: "Polygon",
    //         coordinates: [transformedCoords],
    //       },
    //     },
    //   ],
    // };

    const polygonLayer = new VectorLayer({
      source: new VectorSource({
        // features: new GeoJSON().readFeatures(geojsonObject),
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

    layers.push(polygonLayer);

    map = new Map({
      layers: layers,
      target: mapRef.current.id,
      view: new View({
        center: pointInsideTheField
          ? pointInsideTheField.getCoordinates()
          : fromLonLat(position),
        zoom: 15,
      }),
      controls: defaultControls({
        attribution: false,
      }),
    });
  };

  useEffect(() => {
    if (position) {
      initMap();
    }

    return () => {
      // Important to cleanup the map after unmounting the components
      if (map) {
        map.setTarget(undefined);
      }
    };
  }, [initMap, position]);

  return position ? (
    <div>
      <div id="genMap" className={classes.genMap}>
        <div id="map" ref={mapRef} className={classes.map}></div>
      </div>
    </div>
  ) : (
    <Loader />
  );
};

export default WorldMap;
