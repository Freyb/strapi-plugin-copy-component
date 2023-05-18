'use strict';

module.exports = ({ strapi }) => ({
  index(ctx) {
    ctx.body = strapi
      .plugin('strapi-plugin-copy-component')
      .service('myService')
      .getWelcomeMessage();
  },
});
