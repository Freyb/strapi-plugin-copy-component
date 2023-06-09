'use strict';

module.exports = ({ strapi }) => {
  const getEntityAPI = (uid) => strapi.query(uid);
  const getEntityService = () =>
    strapi.plugin('content-manager').service('entity-manager');

  const getSlugs = async (uid) => {
    const entityAPI = getEntityAPI(uid);
    const entities = await entityAPI.findMany();
    return { entities };
  };

  const getComponents = async (uid, entityID) => {
    const entityAPI = getEntityService();
    const entity = await entityAPI.findOneWithCreatorRolesAndCount(
      entityID,
      uid,
    );
    if (!entity) return { entity: null };
    return { entity };
  };

  return {
    getSlugs,
    getComponents,
  };
};
