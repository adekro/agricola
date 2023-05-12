import React, { useEffect, useRef } from "react";
import BingMaps from "ol/source/BingMaps";
import { defaults as defaultControls } from "ol/control.js";
import Map from "ol/Map.js";
import { Vector as VectorSource } from "ol/source.js";
import Draw from "ol/interaction/Draw.js";
import { fromLonLat } from "ol/proj";
import TileLayer from "ol/layer/Tile.js";
import Overlay from "ol/Overlay.js";
import View from "ol/View.js";
import { Vector as VectorLayer } from "ol/layer.js";
import classes from "../WordMap.module.css";
import "./Tooltip.scss";
import { formatArea, formatLength } from "../utils";
import { unByKey } from "ol/Observable.js";
import { DEFAULT_CENTER } from "../WorldMap";
import { useState } from "react";
import Loader from "../../UI/Loader/Loader";
// import { Button } from "@mui/material";
// import { Button, Typography } from "@mui/material";

const layers = [];
const geoOptions = Object.freeze({
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0,
});

const DrawableMap = ({ onDrawCompleted }) => {
  const mapRef = useRef(null);
  const [center, setCenter] = useState();
  let map,
    draw,
    vector,
    source,
    pointerMoveHandler,
    helpTooltip,
    measureTooltip;

  const initMap = () => {
    source = new VectorSource({ wrapX: false });
    vector = new VectorLayer({
      source: source,
      style: {
        "fill-color": "rgba(255, 255, 255, 0.2)",
        "stroke-color": "#ffcc33",
        "stroke-width": 2,
        "circle-radius": 7,
        "circle-fill-color": "#ffcc33",
      },
    });
    let sketch;
    let helpTooltipElement;
    // let helpTooltip;
    let measureTooltipElement;
    // let measureTooltip;
    const continuePolygonMsg = "Click to continue drawing the polygon";

    pointerMoveHandler = function (evt) {
      if (evt.dragging) {
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

    layers.push(
      new TileLayer({
        visible: true,
        preload: Infinity,
        source: new BingMaps({
          key: `${process.env.REACT_APP_MAP_KEY}`,
          imagerySet: "AerialWithLabelsOnDemand",
        }),
      })
    );
    layers.push(vector);

    map = new Map({
      layers: layers,
      target: mapRef.current.id,
      view: new View({
        center: fromLonLat(center),
        zoom: 15,
      }),
      controls: defaultControls({
        attribution: false,
      }),
    });

    map.on("pointermove", pointerMoveHandler);
    map.getViewport().addEventListener("mouseout", function () {
      helpTooltipElement.classList.add("hidden");
    });

    function addInteraction() {
      draw = new Draw({
        source: source,
        type: "Polygon",
        geometryName: "farm",
      });
      map.addInteraction(draw);

      createHelpTooltip();
      createMeasureTooltip();

      let listener;
      draw.on("drawstart", function (evt) {
        // set sketch
        sketch = evt.feature;

        let tooltipCoord = evt.coordinate;

        listener = sketch.getGeometry().on("change", function (evt) {
          const geom = evt.target;
          let area, length;

          area = formatArea(geom);
          tooltipCoord = geom.getInteriorPoint().getCoordinates();

          length = formatLength(geom);
          // tooltipCoord = geom.getLastCoordinate();

          measureTooltipElement.innerHTML = area;
          measureTooltip.setPosition(tooltipCoord);
        });
      });

      draw.on("drawend", function (evt) {
        measureTooltipElement.className = "ol-tooltip ol-tooltip-static";
        measureTooltip.setOffset([0, -7]);
        const geometry = sketch.getGeometry();
        const area = formatArea(geometry);
        const perimeter = formatLength(geometry);
        const coordinates = geometry.getCoordinates()[0];

        console.log(area, perimeter, coordinates);
        // unset sketch
        sketch = null;
        // unset tooltip so that a new one can be created
        measureTooltipElement = null;
        createMeasureTooltip();
        unByKey(listener);
        map.removeInteraction(draw);
        map.removeOverlay(helpTooltip);
        map.un("pointermove", pointerMoveHandler);

        onDrawCompleted({
          area: area.split(" ")[0],
          perimeter: perimeter.split(" ")[0],
          coordinates: coordinates,
        });
      });
    }

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

    /**
     * Creates a new measure tooltip
     */
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

    addInteraction();
  };

  useEffect(() => {
    if (center) {
      initMap();
    }
  }, [initMap, center]);

  useEffect(() => {
    const onSuccess = (pos) => {
      setCenter([pos.coords.longitude, pos.coords.latitude]);
    };

    const onError = (err) => {
      setCenter(DEFAULT_CENTER);
      console.log(err);
    };
    navigator.geolocation.getCurrentPosition(onSuccess, onError, geoOptions);
  }, []);

  // TO be completed if we want a delete draw button
  // const clearDrawClickHandler = () => {
  //   draw.abortDrawing();
  //   map.getLayers().getArray()[1].getSource().clear();
  //   map.removeOverlay(measureTooltip);
  //   map.addInteraction(draw);
  //   map.addOverlay(helpTooltip);
  //   map.on("pointermove", pointerMoveHandler);
  // };

  return center ? (
    <div>
      {/* <Button onClick={clearDrawClickHandler}>Clear</Button> */}
      <div id="genMap" className={classes.genMap}>
        <div id="map" ref={mapRef} className={classes.map}></div>
      </div>
    </div>
  ) : (
    <Loader />
  );
};

export default DrawableMap;
