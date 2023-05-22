'use strict';

module.exports = ({ strapi }) => {
  const getEntityAPI = (uid) => strapi.query(uid);
  const getEntityService = () =>
    strapi.plugin('content-manager').service('entity-manager');

  const getSlugs = async (uid) => {
    const entityAPI = getEntityAPI(uid);
    const entities = await entityAPI.findMany();
    const result = entities.map(({ id, Slug }) => ({ id, Slug }));
    console.log('getSlugsresult', result);
    return { slugs: result };
  };

  const getComponents = async (uid, entityID, target) => {
    const entityAPI = getEntityService();
    const entity = await entityAPI.findOneWithCreatorRolesAndCount(
      entityID,
      uid,
    );
    if (!entity) return { entity: null };
    console.log(entity);
    return { entity };
  };

  return {
    getSlugs,
    getComponents,
  };
};
