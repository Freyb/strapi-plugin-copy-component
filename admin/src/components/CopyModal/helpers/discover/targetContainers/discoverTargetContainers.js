import {
  getComponentHierarchy,
  getComponentLayout,
} from '../../componentLayout';
import getDisplayName from '../../displayName';

const discoverTargetContainers = ({ contentType, components }, contentData) => {
  const _recursiveDiscoverOfContainers = (
    componentHierarchy,
    componentData,
  ) => {
    const { repeatable, uid, ...rest } = componentHierarchy;
    const attributes = Object.entries(rest);
    if (repeatable) {
      const componentDataFiltered = (componentData ?? []).filter((c) =>
        Object.prototype.hasOwnProperty.call(c, 'id'),
      );
      if (componentDataFiltered.length == 0 || attributes.length == 0)
        return {
          allowedComponents: [uid],
          container: true,
        };

      return {
        ...componentDataFiltered.map((_componentData) => ({
          id: _componentData.id,
          displayName: getDisplayName(
            getComponentLayout(components, uid),
            _componentData,
          ),
          ...attributes.reduce((attrAcc, [key, value]) => {
            attrAcc[key] = _recursiveDiscoverOfContainers(
              value,
              _componentData[key],
            );
            return attrAcc;
          }, {}),
          container: false,
        })),
        allowedComponents: [uid],
        container: true,
      };
    } else {
      if (!componentData || attributes.length == 0) return null;
      return {
        id: componentData.id,
        displayName: getDisplayName(
          getComponentLayout(components, uid),
          componentData,
        ),
        ...attributes.reduce((attrAcc, [key, value]) => {
          attrAcc[key] = _recursiveDiscoverOfContainers(
            value,
            componentData[key],
          );
          return attrAcc;
        }, {}),
        container: false,
      };
    }
  };

  const rootContainers = Object.entries(contentType.attributes).reduce(
    (acc, [currKey, currValue]) => {
      if (currValue.type === 'dynamiczone') {
        const componentDataFiltered = contentData[currKey].filter((c) =>
          Object.prototype.hasOwnProperty.call(c, 'id'),
        );
        acc[currKey] = {
          ...componentDataFiltered.map((_componentData) => {
            const componentHierarchy = getComponentHierarchy(
              _componentData.__component,
              components,
            );
            const { repeatable: _r, uid: _u, ...rest } = componentHierarchy;
            if (Object.keys(rest).length === 0) return null;
            return _recursiveDiscoverOfContainers(
              componentHierarchy,
              _componentData,
            );
          }),
          container: true,
          allowedComponents: currValue.components,
        };
      } else if (
        currValue.type === 'component' &&
        currValue.repeatable === true
      ) {
        const componentHierarchy = {
          ...getComponentHierarchy(currValue.component, components),
          repeatable: true,
        };
        acc[currKey] = _recursiveDiscoverOfContainers(
          componentHierarchy,
          contentData[currKey],
        );
      }
      return acc;
    },
    {},
  );
  return rootContainers;
};

export default discoverTargetContainers;
