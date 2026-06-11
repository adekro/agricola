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

const DrawableMap = ({
  onDrawCompleted,
  mapProviderKey = "osm",
  satelliteLayerKey = "none",
  satelliteOpacity = 0.75,
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const { position } = useGeolocation();

  // Reference for layers to update them without re-creating the map
  const baseLayerRef = useRef(null);
  const satelliteLayerRef = useRef(null);

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
      const satConfig = SATELLITE_LAYERS.find((l) => l.key === satelliteLayerKey);
      if (satConfig) {
        const satLayer = new TileLayer({
          visible: true,
          opacity: satelliteOpacity,
          source: new TileWMS({
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
          }),
        });
        satelliteLayerRef.current = satLayer;
        layers.push(satLayer);
      }
    }

    layers.push(vector);

    const map = new Map({
      layers: layers,
      target: mapRef.current.id,
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
        measureTooltipElement.className = "ol-tooltip ol-tooltip-static";
        measureTooltip.setOffset([0, -7]);

        let geometry = sketch.getGeometry();

        const area = formatArea(geometry);
        const perimeter = formatLength(geometry);

        geometry = geometry.clone().transform("EPSG:3857", "EPSG:4326");
        const coordinates = geometry.getCoordinates()[0];

        sketch = null;
        measureTooltipElement = null;

        createMeasureTooltip();

        if (listener) {
          unByKey(listener);
        }

        map.removeInteraction(draw);

        if (helpTooltip) {
          map.removeOverlay(helpTooltip);
        }

        map.un("pointermove", pointerMoveHandler);

        onDrawCompleted({
          area: area.split(" ")[0],
          perimeter: perimeter.split(" ")[0],
          coordinates,
        });
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

      map.un("pointermove", pointerMoveHandler);
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, [position, onDrawCompleted]);

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
        const satLayer = new TileLayer({
          visible: true,
          opacity: satelliteOpacity,
          source: new TileWMS({
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
          }),
        });

        // Insert before vector layer (which is the last one)
        const layers = mapInstanceRef.current.getLayers();
        layers.insertAt(layers.getLength() - 1, satLayer);
        satelliteLayerRef.current = satLayer;
      }
    }
  }, [satelliteLayerKey]);

  // Handle opacity changes
  useEffect(() => {
    if (satelliteLayerRef.current) {
      satelliteLayerRef.current.setOpacity(satelliteOpacity);
    }
  }, [satelliteOpacity]);

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
