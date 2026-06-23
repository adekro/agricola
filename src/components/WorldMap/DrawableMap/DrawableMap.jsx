import React, { useEffect, useRef } from "react";
import OSM from "ol/source/OSM";
import { defaults as defaultControls } from "ol/control.js";
import Map from "ol/Map.js";
import { Vector as VectorSource } from "ol/source.js";
import Draw from "ol/interaction/Draw.js";
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

const DrawableMap = ({
  onDrawCompleted,
  mapProviderKey = "osm",
  satelliteLayerKey = "none",
  satelliteOpacity = 0.75,
  cadastralLayerKey = "none",
  cadastralOpacity = 0.9,
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const onDrawCompletedRef = useRef(onDrawCompleted);
  const { position } = useGeolocation();

  // Reference for layers to update them without re-creating the map
  const baseLayerRef = useRef(null);
  const satelliteLayerRef = useRef(null);
  const cadastralLayerRef = useRef(null);

  useEffect(() => {
    onDrawCompletedRef.current = onDrawCompleted;
  }, [onDrawCompleted]);

  useEffect(() => {
    if (!position || !mapRef.current) {
      return;
    }

    const source = new VectorSource({ wrapX: false });

    const vector = new VectorLayer({
      source,
      style: {
        "fill-color": "rgba(255, 255, 255, 0.2)",
        "stroke-color": "#ffcc33",
        "stroke-width": 2,
        "circle-radius": 7,
        "circle-fill-color": "#ffcc33",
      },
    });

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

    let sketch;
    let draw;
    let helpTooltip;
    let measureTooltip;
    let helpTooltipElement;
    let measureTooltipElement;
    let listener;

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

        let geometry = sketch.getGeometry();

        const area = formatArea(geometry);
        const perimeter = formatLength(geometry);

        console.log(`Area: ${area}, Perimeter: ${perimeter}`);

        geometry = geometry.clone().transform("EPSG:3857", "EPSG:4326");
        console.log(`Transformed Geometry: ${geometry.getCoordinates()}`);
        const coordinates = geometry.getCoordinates()[0];
        console.log(`Coordinates: ${JSON.stringify(coordinates)}`);

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
        const payload = {
          area: area.split(" ")[0],
          perimeter: perimeter.split(" ")[0],
          coordinates,
        };
        requestAnimationFrame(() => {
          onDrawCompletedRef.current?.(payload);
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

    return () => {
      if (draw) {
        map.removeInteraction(draw);
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
  }, [position]);

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
        <ResponsiveMap id="map" ref={mapRef} className={classes.map} />
      </div>
    </div>
  ) : (
    <Loader />
  );
};

export default DrawableMap;
