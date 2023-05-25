import { request } from '@strapi/helper-plugin';
import pluginId from '../../pluginId';

const dataProxy = {
  getSlugs: async (uid) => {
    const result = await request(`/${pluginId}/getSlugs?uid=${uid}`, {
      method: 'GET',
    });
    return result;
  },
  getComponents: async (uid, entityID) => {
    const result = await request(
      `/${pluginId}/getComponents?uid=${uid}&entityid=${entityID}`,
      {
        method: 'GET',
      },
    );
    return result;
  },
  getLayout: async (uid) => {
    const { data } = await request(
      `/content-manager/content-types/${uid}/configuration`,
      {
        method: 'GET',
      },
    );
    return data;
  },
};

export default dataProxy;
