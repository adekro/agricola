import { getArea, getLength } from "ol/sphere.js";

/**
 * Format length output.
 * @param {LineString} line The line.
 * @return {string} The formatted length.
 */
export const formatLength = function (line) {
  const length = getLength(line);
  let output;
  // if (length > 100) {
  //   output = Math.round((length / 1000) * 100) / 100 + " " + "km";
  // } else {
  //   output = Math.round(length * 100) / 100 + " " + "m";
  // }
  output = Math.round(length * 100) / 100 + " " + "m";
  return output;
};

/**
 * Format area output.
 * @param {Polygon} polygon The polygon.
 * @return {string} Formatted area.
 */
export const formatArea = function (polygon) {
  const area = getArea(polygon);
  let output;
  // if (area > 10000) {
  //   output = Math.round((area / 1000000) * 100) / 100 + " " + "km2";
  // } else {
  //   output = Math.round(area * 100) / 100 + " " + "m2";
  // }
  // Always use km2
  output =
    new Intl.NumberFormat("default", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format((area / 1000000) * 100) + " ettari";
  // output = Math.round((area / 1000000) * 100) + " " + "ettari";
  return output;
};
