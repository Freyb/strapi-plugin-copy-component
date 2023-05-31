import dataProxy from '../../../proxy/DataProxy';
import formatLayouts from '@strapi/admin/admin/src/content-manager/hooks/useFetchContentTypeLayout/utils/formatLayouts';

const getComponentLayout = (allComponents, componentUid) => {
  return allComponents?.[componentUid] ?? {};
};

const getSourceLayout = async (uid, schemas) => {
  const configData = await dataProxy.getLayout(uid);
  const formattedData = formatLayouts(configData, schemas);
  return formattedData;
};

export { getComponentLayout, getSourceLayout };
