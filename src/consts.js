
import { getVendorProperty } from "./utils";

export const REFRESH_INTERVAL = 16.66;
export const TRANSFORM_STYLE_NAME = getVendorProperty('transform', window.document.body);
export const RAF = window.requestAnimationFrame || window.webkitRequestAnimationFrame || function (callback) {
  return setTimeout(callback, REFRESH_INTERVAL)
};