import React, { useEffect, useRef, useState } from "react";
import BingMaps from "ol/source/BingMaps";
import { defaults as defaultControls } from "ol/control.js";
import Map from "ol/Map.js";
import { Vector as VectorSource, OSM, TileWMS } from "ol/source.js";
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

// const layers = []; // Remove or comment out the global layers array

export const ResponsiveMap = styled("div")(({ theme }) => ({
  [theme.breakpoints.down("md")]: {
    width: "90vw;",
  },
}));

const WorldMap = ({ coordinates }) => {
  const mapRef = useRef(null);
  const { position } = useGeolocation();
  const [cadastralLayerVisible, setCadastralLayerVisible] = useState(true);
  const cadastralLayerRef = useRef(null); // To store reference to the layer
  let map, source;

  const initMap = () => {
    const layers = []; // Initialize layers array here for each map instance
    source = new VectorSource({ wrapX: false });

    // Base Bing Maps layer
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

    // Add WMS layer for cadastral maps
    const cadastralLayer = new TileLayer({
      source: new TileWMS({
        url: "https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01/wmsinspirecatasto.asp",
        params: {
          LAYERS: "CP.CadastralParcel,Fabbricati", // Cadastral Parcels and Buildings
          TILED: true,
          VERSION: "1.3.0", // Using 1.3.0 as it's common for INSPIRE
        },
        serverType: "geoserver", // This might need adjustment based on the actual server
        crossOrigin: "anonymous",
      }),
      visible: cadastralLayerVisible, // Controlled by state
      opacity: 0.7, // Set opacity to see through to the base map
    });
    cadastralLayerRef.current = cadastralLayer; // Store layer reference
    layers.push(cadastralLayer);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initMap, position]);

  useEffect(() => {
    if (cadastralLayerRef.current) {
      cadastralLayerRef.current.setVisible(cadastralLayerVisible);
    }
  }, [cadastralLayerVisible]);

  const toggleCadastralLayer = () => {
    setCadastralLayerVisible(!cadastralLayerVisible);
  };

  return position ? (
    <div>
      <div id="genMap" className={classes.genMap}>
        <ResponsiveMap
          id="map"
          ref={mapRef}
          className={classes.map}
        ></ResponsiveMap>
      </div>
      <div style={{ marginTop: "10px", textAlign: "center" }}>
        <label>
          <input
            type="checkbox"
            checked={cadastralLayerVisible}
            onChange={toggleCadastralLayer}
          />
          Mostra Layer Catastale
        </label>
      </div>
    </div>
  ) : (
    <Loader />
  );
};

export default WorldMap;
