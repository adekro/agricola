import React, { useEffect, useRef } from "react";
import OSM from "ol/source/OSM";
import { defaults as defaultControls } from "ol/control.js";
import Map from "ol/Map.js";
import { Vector as VectorSource } from "ol/source.js";
import { fromLonLat } from "ol/proj";
import TileLayer from "ol/layer/Tile.js";
import View from "ol/View.js";
import { Vector as VectorLayer } from "ol/layer.js";
import TileWMS from "ol/source/TileWMS";
import XYZ from "ol/source/XYZ";
import classes from "./WordMap.module.css";

import { useGeolocation } from "../../hooks/useGeolocation";
import Loader from "../UI/Loader/Loader";
import { Polygon } from "ol/geom";
import { Feature } from "ol";
import { styled } from "@mui/material";
import { MAP_PROVIDERS } from "../../config/mapProviders";
import { SATELLITE_LAYERS } from "../../config/satelliteLayers";
import { CADASTRAL_LAYERS } from "../../config/cadastralLayers";

export const DEFAULT_CENTER = [9.0953328, 45.4628246];

export const ResponsiveMap = styled("div")(({ theme }) => ({
  [theme.breakpoints.down("md")]: {
    width: "90vw;",
  },
}));

const WorldMap = ({
  coordinates,
  mapProviderKey = "osm",
  satelliteLayerKey = "none",
  satelliteOpacity = 0.75,
  cadastralLayerKey = "none",
  cadastralOpacity = 0.9,
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const { position } = useGeolocation();

  // Reference for layers to update them without re-creating the map
  const baseLayerRef = useRef(null);
  const satelliteLayerRef = useRef(null);
  const cadastralLayerRef = useRef(null);

  useEffect(() => {
    if (!position || !mapRef.current) {
      return;
    }

    // Base layer
    const provider =
      MAP_PROVIDERS.find((p) => p.key === mapProviderKey) || MAP_PROVIDERS[0];
    const baseLayer = new TileLayer({
      visible: true,
      preload: Infinity,
      source: provider.url
        ? new XYZ({
            url: provider.url,
            attributions: provider.attribution,
            crossOrigin: "anonymous",
          })
        : new OSM({
            attributions: provider.attribution,
          }),
    });
    baseLayerRef.current = baseLayer;

    const layers = [baseLayer];

    // Satellite layer
    if (satelliteLayerKey !== "none") {
      const satConfig = SATELLITE_LAYERS.find((l) => l.key === satelliteLayerKey);
      if (satConfig) {
        const source =
          satConfig.type === "wmts" || satConfig.type === "xyz"
            ? new XYZ({
                url: satConfig.url,
                attributions: satConfig.attribution,
                crossOrigin: "anonymous",
              })
            : new TileWMS({
                url: satConfig.url,
                params: {
                  LAYERS: satConfig.layers,
                  TILED: true,
                  FORMAT: "image/png",
                  TRANSPARENT: true,
                },
                serverType: "geoserver",
                crossOrigin: "anonymous",
                attributions: satConfig.attribution,
              });

        const satLayer = new TileLayer({
          visible: true,
          opacity: satelliteOpacity,
          source: source,
        });
        satelliteLayerRef.current = satLayer;
        layers.push(satLayer);
      }
    }

    if (cadastralLayerKey !== "none") {
      const cadastralConfig = CADASTRAL_LAYERS.find(
        (l) => l.key === cadastralLayerKey,
      );
      if (cadastralConfig) {
        const cadastralLayer = new TileLayer({
          visible: true,
          opacity: cadastralOpacity,
          source: new TileWMS({
            url: cadastralConfig.url,
            params: {
              LAYERS: cadastralConfig.layers,
              TILED: true,
              FORMAT: "image/png",
              TRANSPARENT: true,
            },
            crossOrigin: "anonymous",
            attributions: cadastralConfig.attribution,
          }),
        });
        cadastralLayerRef.current = cadastralLayer;
        layers.push(cadastralLayer);
      }
    }

    // Polygon layer
    let pointInsideTheField = null;
    let polygonLayer = null;

    if (coordinates) {
      const transformedCoords = coordinates.map((coord) => fromLonLat(coord));
      const geometry = new Polygon([transformedCoords]);
      const polygon = new Feature({
        type: "Polygon",
        geometry: geometry,
      });

      pointInsideTheField = geometry.getInteriorPoint();

      polygonLayer = new VectorLayer({
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
      layers.push(polygonLayer);
    }

    const map = new Map({
      layers: layers,
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

    mapInstanceRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, [coordinates, position]);

  // Handle map provider changes
  useEffect(() => {
    if (!mapInstanceRef.current || !baseLayerRef.current) return;

    const provider =
      MAP_PROVIDERS.find((p) => p.key === mapProviderKey) || MAP_PROVIDERS[0];
    const newSource = provider.url
      ? new XYZ({
          url: provider.url,
          attributions: provider.attribution,
          crossOrigin: "anonymous",
        })
      : new OSM({
          attributions: provider.attribution,
        });

    baseLayerRef.current.setSource(newSource);
  }, [mapProviderKey]);

  // Handle satellite layer changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove existing satellite layer if any
    if (satelliteLayerRef.current) {
      mapInstanceRef.current.removeLayer(satelliteLayerRef.current);
      satelliteLayerRef.current = null;
    }

    if (satelliteLayerKey !== "none") {
      const satConfig = SATELLITE_LAYERS.find((l) => l.key === satelliteLayerKey);
      if (satConfig) {
        const source =
          satConfig.type === "wmts" || satConfig.type === "xyz"
            ? new XYZ({
                url: satConfig.url,
                attributions: satConfig.attribution,
                crossOrigin: "anonymous",
              })
            : new TileWMS({
                url: satConfig.url,
                params: {
                  LAYERS: satConfig.layers,
                  TILED: true,
                  FORMAT: "image/png",
                  TRANSPARENT: true,
                },
                serverType: "geoserver",
                crossOrigin: "anonymous",
                attributions: satConfig.attribution,
              });

        const satLayer = new TileLayer({
          visible: true,
          opacity: satelliteOpacity,
          source: source,
        });

        // Insert after base layer (index 0)
        const layers = mapInstanceRef.current.getLayers();
        layers.insertAt(1, satLayer);
        satelliteLayerRef.current = satLayer;
      }
    }
  }, [satelliteLayerKey]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (cadastralLayerRef.current) {
      mapInstanceRef.current.removeLayer(cadastralLayerRef.current);
      cadastralLayerRef.current = null;
    }

    if (cadastralLayerKey !== "none") {
      const cadastralConfig = CADASTRAL_LAYERS.find(
        (l) => l.key === cadastralLayerKey,
      );
      if (cadastralConfig) {
        const cadastralLayer = new TileLayer({
          visible: true,
          opacity: cadastralOpacity,
          source: new TileWMS({
            url: cadastralConfig.url,
            params: {
              LAYERS: cadastralConfig.layers,
              TILED: true,
              FORMAT: "image/png",
              TRANSPARENT: true,
            },
            crossOrigin: "anonymous",
            attributions: cadastralConfig.attribution,
          }),
        });

        const insertIndex = satelliteLayerRef.current ? 2 : 1;
        mapInstanceRef.current.getLayers().insertAt(insertIndex, cadastralLayer);
        cadastralLayerRef.current = cadastralLayer;
      }
    }
  }, [cadastralLayerKey]);

  // Handle opacity changes
  useEffect(() => {
    if (satelliteLayerRef.current) {
      satelliteLayerRef.current.setOpacity(satelliteOpacity);
    }
  }, [satelliteOpacity]);

  useEffect(() => {
    if (cadastralLayerRef.current) {
      cadastralLayerRef.current.setOpacity(cadastralOpacity);
    }
  }, [cadastralOpacity]);

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
