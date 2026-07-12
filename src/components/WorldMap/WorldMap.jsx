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
import { Fill, Stroke, Style } from "ol/style";
import { unByKey } from "ol/Observable.js";
import { styled } from "@mui/material";
import { MAP_PROVIDERS } from "../../config/mapProviders";
import { SATELLITE_LAYERS } from "../../config/satelliteLayers";
import { CADASTRAL_LAYERS } from "../../config/cadastralLayers";
import { createCadastralSource } from "../../lib/cadastralWms";

export const DEFAULT_CENTER = [9.0953328, 45.4628246];

export const ResponsiveMap = styled("div")(({ theme }) => ({
  [theme.breakpoints.down("md")]: {
    width: "90vw;",
  },
}));

const WorldMap = ({
  coordinates,
  polygonFeatures,
  focusCoordinates,
  selectedFarmlandId,
  onFarmlandClick,
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
      const satConfig = SATELLITE_LAYERS.find(
        (l) => l.key === satelliteLayerKey,
      );
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
          source: createCadastralSource(cadastralConfig),
        });
        cadastralLayerRef.current = cadastralLayer;
        layers.push(cadastralLayer);
      }
    }

    // Polygon layer
    let pointInsideTheField = null;
    let polygonLayer = null;

    const polygonItems = polygonFeatures?.length
      ? polygonFeatures
      : coordinates?.length
        ? (Array.isArray(coordinates[0]?.[0]) ? coordinates : [coordinates]).map(
            (item) => ({ coordinates: item }),
          )
        : [];
    if (polygonItems.length) {
      const features = polygonItems.map((item) => {
        const geometry = new Polygon([
          item.coordinates.map((coord) => fromLonLat(coord)),
        ]);
        return new Feature({
          type: "Polygon",
          geometry,
          farmlandId: item.id || null,
          geometryStatus: item.geometryStatus || "defined",
        });
      });

      pointInsideTheField = features[0].getGeometry().getInteriorPoint();

      polygonLayer = new VectorLayer({
        source: new VectorSource({
          features,
        }),
        style: (feature) => {
          const isSelected =
            feature.get("farmlandId") === selectedFarmlandId;
          return new Style({
            fill: new Fill({
              color: isSelected
                ? "rgba(255, 204, 51, 0.45)"
                : "rgba(255, 255, 255, 0.2)",
            }),
            stroke: new Stroke({
              color: "#ffcc33",
              width: isSelected ? 4 : 2,
              lineDash:
                feature.get("geometryStatus") === "cadastral_coverage"
                  ? [8, 6]
                  : undefined,
            }),
          });
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

    const clickHandler = map.on("singleclick", (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (item) => item);
      const farmlandId = feature?.get("farmlandId");
      if (farmlandId && onFarmlandClick) onFarmlandClick(farmlandId);
    });

    if (polygonLayer && polygonLayer.getSource().getFeatures().length > 1) {
      map.getView().fit(polygonLayer.getSource().getExtent(), {
        padding: [40, 40, 40, 40],
        maxZoom: 17,
      });
    }

    return () => {
      unByKey(clickHandler);
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, [coordinates, polygonFeatures, position, selectedFarmlandId, onFarmlandClick]);

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
      const satConfig = SATELLITE_LAYERS.find(
        (l) => l.key === satelliteLayerKey,
      );
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
          source: createCadastralSource(cadastralConfig),
        });

        const insertIndex = satelliteLayerRef.current ? 2 : 1;
        mapInstanceRef.current
          .getLayers()
          .insertAt(insertIndex, cadastralLayer);
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

  useEffect(() => {
    if (!mapInstanceRef.current || !focusCoordinates?.length) return;

    const geometry = new Polygon([
      focusCoordinates.map((coord) => fromLonLat(coord)),
    ]);
    mapInstanceRef.current.getView().fit(geometry.getExtent(), {
      padding: [60, 60, 60, 60],
      maxZoom: 17,
      duration: 500,
    });
  }, [focusCoordinates]);

  return position ? (
    <div id="genMap" className={classes.genMap}>
      <ResponsiveMap
        id="map"
        ref={mapRef}
        className={classes.map}
      ></ResponsiveMap>
    </div>
  ) : (
    <Loader />
  );
};

export default WorldMap;
