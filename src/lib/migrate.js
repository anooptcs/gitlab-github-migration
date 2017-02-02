'use strict';

import manifest from './manifest.json';

/**
 * List known apps.
 * @method list
 */
export function list() {
  console.log(manifest.apps);
}
