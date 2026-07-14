import React, { useEffect, useRef } from "react";
import OSM from "ol/source/OSM";
import { defaults as defaultControls } from "ol/control.js";
import Map from "ol/Map.js";
import { Vector as VectorSource } from "ol/source.js";
import Draw from "ol/interaction/Draw.js";
import Modify from "ol/interaction/Modify.js";
import { fromLonLat } from "ol/proj";
import TileLayer from "ol/layer/Tile.js";
import Overlay from "ol/Overlay.js";
import View from "ol/View.js";
import { Vector as VectorLayer } from "ol/layer.js";
import TileWMS from "ol/source/TileWMS";
import XYZ from "ol/source/XYZ";
import classes from "../WordMap.module.css";
import "./Tooltip.scss";
import { formatArea, formatLength } from "../utils";
import { unByKey } from "ol/Observable.js";
import Loader from "../../UI/Loader/Loader";
import { useGeolocation } from "../../../hooks/useGeolocation";
import { ResponsiveMap } from "../WorldMap";
import { MAP_PROVIDERS } from "../../../config/mapProviders";
import { SATELLITE_LAYERS } from "../../../config/satelliteLayers";
import { CADASTRAL_LAYERS } from "../../../config/cadastralLayers";
import { createCadastralSource } from "../../../lib/cadastralWms";
import GeoJSON from "ol/format/GeoJSON";
import { Fill, Stroke, Style } from "ol/style";
import Feature from "ol/Feature";
import Polygon from "ol/geom/Polygon";
import Collection from "ol/Collection";

const DrawableMap = ({
  onDrawCompleted,
  mapProviderKey = "osm",
  satelliteLayerKey = "none",
  satelliteOpacity = 0.75,
  cadastralLayerKey = "none",
  cadastralOpacity = 0.9,
  vulnerableZonesGeoJson = null,
  vulnerableZonesOpacity = 0.35,
  terrainPolygons = [],
  cadastralPolygons = [],
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const onDrawCompletedRef = useRef(onDrawCompleted);
  const { position } = useGeolocation();

  // Reference for layers to update them without re-creating the map
  const baseLayerRef = useRef(null);
  const satelliteLayerRef = useRef(null);
  const cadastralLayerRef = useRef(null);
  const vulnerableZonesLayerRef = useRef(null);

  useEffect(() => {
    onDrawCompletedRef.current = onDrawCompleted;
  }, [onDrawCompleted]);

  useEffect(() => {
    if (!position || !mapRef.current) {
      return;
    }

    const source = new VectorSource({ wrapX: false });

    const addInitialPolygons = (polygons, geometryType) => {
      polygons.forEach((coordinates) => {
        if (!coordinates?.length) return;
        const feature = new Feature({
          geometry: new Polygon([
            coordinates.map((coordinate) => fromLonLat(coordinate)),
          ]),
          geometryType,
        });
        source.addFeature(feature);
      });
    };
    addInitialPolygons(cadastralPolygons, "cadastral");
    addInitialPolygons(terrainPolygons, "terrain");

    const vector = new VectorLayer({
      source,
      style: (feature) => {
        const isCadastral = feature.get("geometryType") === "cadastral";
        const color = isCadastral ? "#f57c00" : "#1976d2";
        return new Style({
          fill: new Fill({
            color: isCadastral
              ? "rgba(245, 124, 0, 0.18)"
              : "rgba(25, 118, 210, 0.22)",
          }),
          stroke: new Stroke({ color, width: 3 }),
        });
      },
    });
    vector.setZIndex(2);

    // Initial base layer
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

    // Initial satellite layer if any
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

    layers.push(vector);

    const map = new Map({
      layers: layers,
      target: mapRef.current,
      view: new View({
        center: fromLonLat(position),
        zoom: 15,
      }),
      controls: defaultControls({
        attribution: true,
      }),
    });

    mapInstanceRef.current = map;

    if (source.getFeatures().length) {
      map.getView().fit(source.getExtent(), {
        padding: [40, 40, 40, 40],
        maxZoom: 17,
      });
    }

    let sketch;
    let draw;
    let modify;
    let helpTooltip;
    let measureTooltip;
    let helpTooltipElement;
    let measureTooltipElement;
    let listener;
    const editableTerrainFeatures = new Collection(
      source
        .getFeatures()
        .filter((feature) => feature.get("geometryType") === "terrain"),
    );

    const notifyGeometryChanged = (geometry) => {
      const area = formatArea(geometry);
      const perimeter = formatLength(geometry);
      const transformedGeometry = geometry
        .clone()
        .transform("EPSG:3857", "EPSG:4326");
      onDrawCompletedRef.current?.({
        area: area.split(" ")[0],
        perimeter: perimeter.split(" ")[0],
        coordinates: transformedGeometry.getCoordinates()[0],
      });
    };

    const continuePolygonMsg = "Click to continue drawing the polygon";

    const pointerMoveHandler = function (evt) {
      if (evt.dragging || !helpTooltipElement) {
        return;
      }

      let helpMsg = "Click to start drawing";

      if (sketch) {
        helpMsg = continuePolygonMsg;
      }

      helpTooltipElement.innerHTML = helpMsg;
      helpTooltip.setPosition(evt.coordinate);
      helpTooltipElement.classList.remove("hidden");
    };

    function createHelpTooltip() {
      if (helpTooltipElement) {
        helpTooltipElement.parentNode.removeChild(helpTooltipElement);
      }

      helpTooltipElement = document.createElement("div");
      helpTooltipElement.className = "ol-tooltip hidden";

      helpTooltip = new Overlay({
        element: helpTooltipElement,
        offset: [15, 0],
        positioning: "center-left",
      });

      map.addOverlay(helpTooltip);
    }

    function createMeasureTooltip() {
      if (measureTooltipElement) {
        measureTooltipElement.parentNode.removeChild(measureTooltipElement);
      }

      measureTooltipElement = document.createElement("div");
      measureTooltipElement.className = "ol-tooltip ol-tooltip-measure";

      measureTooltip = new Overlay({
        element: measureTooltipElement,
        offset: [0, -15],
        positioning: "bottom-center",
        stopEvent: false,
        insertFirst: false,
      });

      map.addOverlay(measureTooltip);
    }

    function addInteraction() {
      draw = new Draw({
        source,
        type: "Polygon",
        geometryName: "farm",
      });

      map.addInteraction(draw);

      createHelpTooltip();
      createMeasureTooltip();

      draw.on("drawstart", function (evt) {
        sketch = evt.feature;
        sketch.set("geometryType", "terrain");
        source
          .getFeatures()
          .filter(
            (feature) =>
              feature !== sketch && feature.get("geometryType") === "terrain",
          )
          .forEach((feature) => source.removeFeature(feature));
        editableTerrainFeatures.clear();

        let tooltipCoord = evt.coordinate;

        listener = sketch.getGeometry().on("change", function (evt) {
          const geom = evt.target;

          const area = formatArea(geom);
          tooltipCoord = geom.getInteriorPoint().getCoordinates();

          measureTooltipElement.innerHTML = area;
          measureTooltip.setPosition(tooltipCoord);
        });
      });

      draw.on("drawend", function () {
        console.log("Draw completed");
        measureTooltipElement.className = "ol-tooltip ol-tooltip-static";
        measureTooltip.setOffset([0, -7]);

        const geometry = sketch.getGeometry();

        const area = formatArea(geometry);
        const perimeter = formatLength(geometry);

        console.log(`Area: ${area}, Perimeter: ${perimeter}`);

        editableTerrainFeatures.push(sketch);

        sketch = null;
        measureTooltipElement = null;

        createMeasureTooltip();
        console.log("Measure tooltip recreated for next drawing");

        if (listener) {
          unByKey(listener);
        }
        console.log("Listener removed after drawing completed");

        map.removeInteraction(draw);

        if (helpTooltip) {
          map.removeOverlay(helpTooltip);
        }
        console.log("Help tooltip removed after drawing completed");

        map.un("pointermove", pointerMoveHandler);

        console.log("Pointer move handler removed after drawing completed");
        requestAnimationFrame(() => {
          notifyGeometryChanged(geometry);
        });
        console.log(
          "onDrawCompleted callback executed with area, perimeter, and coordinates",
        );
      });
    }

    map.on("pointermove", pointerMoveHandler);

    map.getViewport().addEventListener("mouseout", function () {
      if (helpTooltipElement) {
        helpTooltipElement.classList.add("hidden");
      }
    });

    addInteraction();

    modify = new Modify({ features: editableTerrainFeatures });
    modify.on("modifyend", (event) => {
      const feature = event.features.item(0);
      if (feature) notifyGeometryChanged(feature.getGeometry());
    });
    map.addInteraction(modify);

    return () => {
      if (draw) {
        map.removeInteraction(draw);
      }
      if (modify) {
        map.removeInteraction(modify);
      }

      if (helpTooltip) {
        map.removeOverlay(helpTooltip);
      }

      if (measureTooltip) {
        map.removeOverlay(measureTooltip);
      }

      if (listener) {
        unByKey(listener);
      }

      map.un("pointermove", pointerMoveHandler);
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, [position, terrainPolygons, cadastralPolygons]);

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

        // Insert before vector layer (which is the last one)
        const layers = mapInstanceRef.current.getLayers();
        const insertIndex = cadastralLayerRef.current
          ? layers.getLength() - 2
          : layers.getLength() - 1;
        layers.insertAt(insertIndex, satLayer);
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

        const layers = mapInstanceRef.current.getLayers();
        layers.insertAt(layers.getLength() - 1, cadastralLayer);
        cadastralLayerRef.current = cadastralLayer;
      }
    }
  }, [cadastralLayerKey]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (vulnerableZonesLayerRef.current) {
      mapInstanceRef.current.removeLayer(vulnerableZonesLayerRef.current);
      vulnerableZonesLayerRef.current = null;
    }

    if (vulnerableZonesGeoJson) {
      const layer = new VectorLayer({
        opacity: vulnerableZonesOpacity,
        source: new VectorSource({
          features: new GeoJSON().readFeatures(vulnerableZonesGeoJson, {
            featureProjection: "EPSG:3857",
          }),
        }),
        style: new Style({
          fill: new Fill({ color: "rgba(156, 39, 176, 0.45)" }),
          stroke: new Stroke({ color: "#7b1fa2", width: 2 }),
        }),
      });
      layer.setZIndex(1);
      mapInstanceRef.current.addLayer(layer);
      vulnerableZonesLayerRef.current = layer;
    }
  }, [vulnerableZonesGeoJson]);

  useEffect(() => {
    vulnerableZonesLayerRef.current?.setOpacity(vulnerableZonesOpacity);
  }, [vulnerableZonesOpacity]);

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
    <div id="genMap" className={classes.genMap}>
      <ResponsiveMap id="map" ref={mapRef} className={classes.map} />
    </div>
  ) : (
    <Loader />
  );
};

export default DrawableMap;
