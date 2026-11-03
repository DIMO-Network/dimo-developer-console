/**
 * The largest brand image. console-api refuses anything bigger, and the Server
 * Action body limit in next.config.mjs has to leave room for it.
 */
export const BRAND_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
