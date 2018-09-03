const { resolve } = require('path');
const getMiniappType = require('../helpers/getMiniappType');
const { getPages } = require('../helpers/getAppConfig');

const mpLoaderPath = require.resolve('mp-loader');

/**
 * 获取 webpack entry
 * @param {String} projectDir 项目路径
 */
module.exports = function getEntry(projectDir) {
  const miniappType = getMiniappType(projectDir);
  const appPages = getPages(projectDir);
  const entry = {};

  if (miniappType === 'sfc') {
    /* app entry */
    entry.$app = resolve(projectDir, 'app.js');
    /* page entry */
    Object.keys(appPages).forEach((key, idx) => {
      entry[key] = resolve(projectDir, appPages[key]);
    });
  } else if (miniappType === 'mp') {
    const appFilePath = resolve(projectDir, 'app.js');

    /* app entry */
    entry.app = `!!${mpLoaderPath}?type=my!${appFilePath}`;
  }

  return entry;
};