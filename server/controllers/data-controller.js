'use strict';

const pluginId = require('../../admin/src/pluginId');

module.exports = ({ strapi }) => {
  const dataService = strapi.plugin(pluginId).service('dataService');

  const getSlugs = async (ctx) => {
    const { query } = ctx.request;
    ctx.body = await dataService.getSlugs(query.uid);
  };
  const getComponents = async (ctx) => {
    const { query } = ctx.request;
    ctx.body = await dataService.getComponents(query.uid, query.entityid);
  };

  return {
    getSlugs,
    getComponents,
  };
};
