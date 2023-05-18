'use strict';

module.exports = ({ strapi }) => {
  const getEntityAPI = (uid) => strapi.query(uid);

  const getSlugs = async (uid) => {
    const entityAPI = getEntityAPI(uid);
    const entities = await entityAPI.findMany();
    const result = entities.map(({ id, Slug }) => ({ id, Slug }));
    console.log('getSlugsresult', result);
    return { slugs: result };
  };

  const getComponents = async (uid, entityID, target) => {
    const entityAPI = getEntityAPI(uid);
    const entity = await entityAPI.findOne({
      where: { id: entityID },
      populate: true,
    });
    if (!entity) return { components: [] };
    console.log(entity);
    return { components: ['hy'] };
  };

  return {
    getSlugs,
    getComponents,
  };
};
