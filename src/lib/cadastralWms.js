import TileWMS from "ol/source/TileWMS";
import { get as getProjection } from "ol/proj";
import { register } from "ol/proj/proj4";
import proj4 from "proj4";

const CADASTRAL_ERROR_EVENT = "cadastral-wms-error";
const BLANK_TILE_DATA_URL =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

let projectionsRegistered = false;

function registerCadastralProjections() {
  if (projectionsRegistered) {
    return;
  }

  proj4.defs("EPSG:6706", "+proj=longlat +ellps=GRS80 +no_defs +type=crs");
  register(proj4);

  const cadastralProjection = getProjection("EPSG:6706");

  if (cadastralProjection) {
    cadastralProjection.setExtent([5.93, 34.76, 18.99, 47.1]);
    cadastralProjection.setWorldExtent([5.93, 34.76, 18.99, 47.1]);
  }

  projectionsRegistered = true;
}

function dispatchCadastralError(detail) {
  window.dispatchEvent(
    new CustomEvent(CADASTRAL_ERROR_EVENT, {
      detail,
    }),
  );
}

function createCadastralTileLoadFunction(layerKey) {
  return async (tile, src) => {
    const image = tile.getImage();

    try {
      const response = await fetch(src, {
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      });

      const contentType = response.headers.get("content-type") || "";

      if (!response.ok || !contentType.startsWith("image/")) {
        const body = await response.text();

        dispatchCadastralError({
          layerKey,
          url: src,
          status: response.status,
          contentType,
          bodyPreview: body.slice(0, 300),
        });

        console.error("Cadastral WMS tile rejected", {
          layerKey,
          url: src,
          status: response.status,
          contentType,
          bodyPreview: body.slice(0, 300),
        });

        image.src = BLANK_TILE_DATA_URL;
        return;
      }

      const objectUrl = URL.createObjectURL(await response.blob());
      image.onload = () => URL.revokeObjectURL(objectUrl);
      image.onerror = () => URL.revokeObjectURL(objectUrl);
      image.src = objectUrl;
    } catch (error) {
      dispatchCadastralError({
        layerKey,
        url: src,
        message: error.message,
      });

      console.error("Cadastral WMS tile load error", {
        layerKey,
        url: src,
        message: error.message,
      });

      image.src = BLANK_TILE_DATA_URL;
    }
  };
}

export function createCadastralSource(config) {
  registerCadastralProjections();

  return new TileWMS({
    url: config.url,
    projection: config.sourceProjection,
    params: {
      LAYERS: config.layers,
      VERSION: config.version || "1.1.1",
      TILED: true,
      FORMAT: "image/png",
      TRANSPARENT: true,
    },
    crossOrigin: "anonymous",
    attributions: config.attribution,
    tileLoadFunction: createCadastralTileLoadFunction(config.key),
  });
}

export { CADASTRAL_ERROR_EVENT };
