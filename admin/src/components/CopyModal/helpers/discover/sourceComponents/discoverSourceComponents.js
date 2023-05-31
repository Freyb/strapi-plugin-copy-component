import { isEmpty } from 'lodash';
import {
  getComponentHierarchy,
  getComponentLayout,
} from '../../componentLayout';
import getDisplayName from '../../displayName';

const discoverSourceComponents = (
  { contentType, components },
  contentData,
  allowedComponents,
) => {
  const _recursiveDiscoverOfComponents = (
    componentHierarchy,
    componentData,
  ) => {
    const { repeatable, uid, ...rest } = componentHierarchy;
    const attributes = Object.entries(rest);

    if (repeatable) {
      if (componentData.length == 0) return null;

      const currentUidIncluded = allowedComponents.includes(uid);
      const foundComponents = currentUidIncluded ? componentData : {};

      const componentResult = {
        ...(currentUidIncluded && {
          _foundComponents: foundComponents.map((c) => ({
            ...c,
            displayName: getDisplayName(getComponentLayout(components, uid), c),
            __component: uid,
          })),
        }),
        ...componentData.map((componentElementData) => {
          const elementResult = attributes.reduce((attrAcc, [key, value]) => {
            const attributeResult = _recursiveDiscoverOfComponents(
              value,
              componentElementData[key],
            );
            if (!attributeResult) return attrAcc;
            attrAcc[key] = attributeResult;
            return attrAcc;
          }, {});
          if (isEmpty(elementResult)) return null;
          return {
            ...elementResult,
            displayName: getDisplayName(
              getComponentLayout(components, uid),
              componentElementData,
            ),
          };
        }),
      };
      if (
        isEmpty(componentResult) ||
        !Object.values(componentResult).some((x) => !!x)
      )
        return null;
      return componentResult;
    } else {
      if (!componentData) return null;

      const currentUidIncluded = allowedComponents.includes(uid);
      const foundComponent = currentUidIncluded ? componentData : {};

      const elementResult = attributes.reduce((attrAcc, [key, value]) => {
        const attributeResult = _recursiveDiscoverOfComponents(
          value,
          componentData[key],
        );
        if (!attributeResult) return attrAcc;
        attrAcc[key] = attributeResult;
        return attrAcc;
      }, {});
      const componentResult = {
        ...(currentUidIncluded && {
          _foundComponents: {
            ...foundComponent,
            displayName: getDisplayName(
              getComponentLayout(components, uid),
              foundComponent,
            ),
            __component: uid,
          },
        }),
        ...elementResult,
      };
      if (isEmpty(componentResult)) return null;
      return {
        ...componentResult,
        displayName: getDisplayName(
          getComponentLayout(components, uid),
          componentData,
        ),
      };
    }
  };

  const rootContainers = Object.entries(contentType.attributes).reduce(
    (acc, [currKey, currValue]) => {
      if (currValue.type === 'dynamiczone') {
        const dynamicZoneComponents = contentData[currKey].map(
          (_componentData) => {
            const componentHierarchy = getComponentHierarchy(
              _componentData.__component,
              components,
              allowedComponents,
            );
            if (isEmpty(componentHierarchy)) return null;

            return _recursiveDiscoverOfComponents(
              componentHierarchy,
              _componentData,
            );
          },
        );
        if (dynamicZoneComponents.length == 0) return acc;

        acc[currKey] = dynamicZoneComponents;
      } else if (
        currValue.type === 'component' &&
        currValue.repeatable === true
      ) {
        const componentHierarchy = getComponentHierarchy(
          currValue.component,
          components,
          allowedComponents,
        );
        if (isEmpty(componentHierarchy)) return acc;

        acc[currKey] = _recursiveDiscoverOfComponents(
          { ...componentHierarchy, repeatable: true },
          contentData[currKey],
        );
      }
      return acc;
    },
    {},
  );
  return rootContainers;
};

export default discoverSourceComponents;
