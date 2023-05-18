import { request } from '@strapi/helper-plugin';
import pluginId from '../../pluginId';

const dataProxy = {
  getSlugs: async (uid) => {
    const result = await request(`/${pluginId}/getSlugs?uid=${uid}`, {
      method: 'GET',
    });
    return result;
  },
  getComponents: async (uid, entityID, target) => {
    const result = await request(
      `/${pluginId}/getComponents?uid=${uid}&entityid=${entityID}&target=${target}`,
      {
        method: 'GET',
      },
    );
    return result;
  },
};

export default dataProxy;