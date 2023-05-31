import { isEmpty, isArray } from 'lodash';
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

const getComponentHierarchy = (
  rootComponentUid,
  componentList,
  filterBranch,
) => {
  const _recursiveDisvoverComponentHierarchy = (componentUid) => {
    const layout = getComponentLayout(componentList, componentUid);
    const result = Object.entries(layout.attributes).reduce(
      (acc, [currKey, currValue]) => {
        if (currValue.type === 'component') {
          const subComponentResult = _recursiveDisvoverComponentHierarchy(
            currValue.component,
          );
          if (
            isArray(filterBranch) &&
            isEmpty(subComponentResult) &&
            !filterBranch.includes(currValue.component)
          ) {
            return acc;
          }
          acc[currKey] = {
            ...subComponentResult,
            uid: currValue.component,
            repeatable: currValue.repeatable,
          };
        }
        return acc;
      },
      {},
    );
    return result;
  };
  const subComponentResult =
    _recursiveDisvoverComponentHierarchy(rootComponentUid);
  if (
    isArray(filterBranch) &&
    isEmpty(subComponentResult) &&
    !filterBranch.includes(rootComponentUid)
  ) {
    return {};
  }
  return {
    ...subComponentResult,
    uid: rootComponentUid,
  };
};

export { getComponentLayout, getSourceLayout, getComponentHierarchy };
