import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { get, set, isEmpty, isArray, cloneDeep } from 'lodash';
import {
  useNotification,
  useCMEditViewDataManager,
} from '@strapi/helper-plugin';
import {
  Dialog,
  //   DialogBody,
  DialogFooter,
  Flex,
  Button,
  Box,
  Loader,
  Select,
  Option,
  Radio,
  RadioGroup,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { ChevronRight, Check } from '@strapi/icons';
import getTrad from '../../utils/getTrad';
import dataProxy from '../../proxy/DataProxy';
import {
  getDisplayName,
  ModifiedDialogBody,
  RadioTypography,
  getComponentLayout,
  getSourceLayout,
} from './helpers';
import { getMaxTempKey } from '@strapi/admin/admin/src/content-manager/utils';
import { cleanData } from '@strapi/plugin-i18n/admin/src/components/CMEditViewInjectedComponents/CMEditViewCopyLocale/utils';

const Steps = {
  TargetContainer: 'TargetContainer',
  SourceType: 'SourceType',
  SourceSlug: 'SourceSlug',
  Component: 'Component',
};

const discoverComponentHierarchy = (
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

const discoverTargetContainers = ({ contentType, components }, contentData) => {
  const _recursiveDiscoverOfContainers = (
    componentHierarchy,
    componentData,
  ) => {
    const { repeatable, uid, ...rest } = componentHierarchy;
    const attributes = Object.entries(rest);
    if (repeatable) {
      const componentDataFiltered = componentData.filter((c) =>
        c.hasOwnProperty('id'),
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
      if (!componentData) return null;
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
          c.hasOwnProperty('id'),
        );
        acc[currKey] = {
          ...componentDataFiltered.map((_componentData) => {
            const componentHierarchy = discoverComponentHierarchy(
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
          ...discoverComponentHierarchy(currValue.component, components),
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
        ...componentData.map((componentDataElement) => {
          const elementResult = attributes.reduce((attrAcc, [key, value]) => {
            const attributeResult = _recursiveDiscoverOfComponents(
              value,
              componentDataElement[key],
            );
            if (!attributeResult) return attrAcc;
            attrAcc[key] = attributeResult;
            return attrAcc;
          }, {});
          if (isEmpty(elementResult)) return null;
          return elementResult;
        }),
      };
      if (isEmpty(componentResult)) return null;
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
      return componentResult;
    }
  };

  const rootContainers = Object.entries(contentType.attributes).reduce(
    (acc, [currKey, currValue]) => {
      if (currValue.type === 'dynamiczone') {
        const dynamicZoneComponents = contentData[currKey].map(
          (_componentData) => {
            const componentHierarchy = discoverComponentHierarchy(
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
        const componentHierarchy = discoverComponentHierarchy(
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

const CopyModal = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  allowedSourceTypes,
  schemas,
}) => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();

  // Get current layout
  const { allLayoutData, modifiedData, initialData } =
    useCMEditViewDataManager();

  // Step number
  const [stepNumber, setStepNumber] = useState(Steps.TargetContainer);

  // Select target container
  const targetSectionHierarchy = useMemo(
    () => discoverTargetContainers(allLayoutData, initialData),
    [allLayoutData, initialData],
  );

  const [selectedTarget, setSelectedTarget] = useState('');
  const selectedTargetPath = useMemo(
    () => selectedTarget.split('.').slice(1),
    [selectedTarget],
  );

  // Select source type
  const [allSourceLayouts, setAllSourceLayouts] = useState();
  const [tmpSelectedSourceType, setTmpSelectedSourceType] = useState('');
  const [selectedSourceType, setSelectedSourceType] = useState('');

  // Select source slug
  const [availableSlugs, setAvailableSlugs] = useState([]);
  const [tmpSelectedSlug, setTmpSelectedSlug] = useState('');
  const [selectedSlug, setSelectedSlug] = useState('');
  const selectedSlugName = useMemo(
    () => availableSlugs.find((x) => x.id === selectedSlug)?.Slug || '',
    [availableSlugs, selectedSlug],
  );

  // Select source component
  const [availableComponents, setAvailableComponents] = useState([]);
  const [tmpSelectedComponent, setTmpSelectedComponent] = useState('');

  // Modal initialization
  const initializeModal = () => {
    // TODO: REVERT logic
    if (false) {
      // setSelectedTarget(targetSections[0]);
      // setStepNumber(Steps.SourceSlug);
    } else {
      setSelectedTarget('');
      setStepNumber(Steps.TargetContainer);
    }
    setTmpSelectedSourceType('');
    setSelectedSourceType('');
    setTmpSelectedSlug('');
    setSelectedSlug('');
    setTmpSelectedComponent('');
  };

  useEffect(() => {
    initializeModal();
  }, []);

  useEffect(async () => {
    const sourceLayouts = await Promise.all(
      allowedSourceTypes.map((s) => getSourceLayout(s, schemas)),
    );
    setAllSourceLayouts(
      sourceLayouts.reduce((acc, curr, idx) => {
        return { ...acc, [allowedSourceTypes[idx]]: curr };
      }, {}),
    );
  }, []);

  // Fetch slugs by layout of source uid
  useEffect(async () => {
    if (selectedSourceType && allSourceLayouts) {
      try {
        // Get layout
        const sourceLayout = allSourceLayouts[selectedSourceType];

        // Get slugs
        const { entities } = await dataProxy.getSlugs(selectedSourceType);
        setAvailableSlugs(
          entities
            .filter((e) => e.id !== modifiedData.id)
            .map((e) => ({
              ...e,
              displayName: getDisplayName(sourceLayout.contentType, e, false),
            })),
        );
      } catch (error) {
        console.error(error);
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      }
    }
  }, [selectedSourceType]);

  // Fetch components of source slug
  useEffect(() => {
    if (selectedSourceType && allSourceLayouts && selectedSlug) {
      dataProxy
        .getComponents(selectedSourceType, selectedSlug)
        .then(({ entity }) => {
          if (entity) {
            const cleanedData = cleanData(
              entity,
              allLayoutData,
              entity.localizations,
            );
            const sourceLayout = allSourceLayouts[selectedSourceType];
            const sourceComponents = discoverSourceComponents(
              sourceLayout,
              cleanedData,
              get(targetSectionHierarchy, selectedTargetPath).allowedComponents,
            );
            setAvailableComponents(sourceComponents);
          }
        })
        .catch((e) => {
          console.error(e);
          toggleNotification({
            type: 'warning',
            message: { id: 'notification.error' },
          });
        });
    }
  }, [selectedSourceType, selectedSlug]);

  const handleCancel = async () => {
    initializeModal();
    onClose();
  };

  const canProceed = () => {
    return (
      (stepNumber === Steps.TargetContainer && selectedTarget !== '') ||
      (stepNumber === Steps.SourceType && tmpSelectedSourceType !== '') ||
      (stepNumber === Steps.SourceSlug && tmpSelectedSlug !== '') ||
      (stepNumber === Steps.Component && tmpSelectedComponent !== '')
    );
  };

  const handleNext = () => {
    if (!canProceed()) return;

    if (stepNumber === Steps.TargetContainer) {
      setStepNumber(Steps.SourceType);
    } else if (stepNumber === Steps.SourceType) {
      setSelectedSourceType(tmpSelectedSourceType);
      setStepNumber(Steps.SourceSlug);
    } else if (stepNumber === Steps.SourceSlug) {
      setSelectedSlug(tmpSelectedSlug);
      setStepNumber(Steps.Component);
    } else if (stepNumber === Steps.Component) {
      const sourceComponentPath = tmpSelectedComponent.split('.').slice(1);
      const selectedComponent = get(availableComponents, sourceComponentPath);

      const newContentData = cloneDeep(modifiedData);
      const originalTargetData = get(modifiedData, selectedTargetPath);

      const fieldsToRemove = ['index', 'displayName'];
      const cleanedComponent = Object.fromEntries(
        Object.entries(selectedComponent).filter(
          ([key, _value]) => !fieldsToRemove.includes(key),
        ),
      );
      cleanedComponent.__temp_key__ = getMaxTempKey(originalTargetData) + 1;

      set(newContentData, selectedTargetPath, [
        ...originalTargetData,
        cleanedComponent,
      ]);

      onSubmit(newContentData);
      initializeModal();
    }
  };

  const getModalTitle = useMemo(() => {
    if (stepNumber == Steps.TargetContainer)
      return formatMessage({
        id: getTrad('modal.title.target'),
      });
    if (stepNumber == Steps.SourceType)
      return formatMessage({
        id: getTrad('modal.title.sourcetype'),
      });
    if (stepNumber == Steps.SourceSlug)
      return formatMessage({
        id: getTrad('modal.title.slug'),
      });
    if (stepNumber == Steps.Component)
      return formatMessage(
        { id: getTrad('modal.title.component') },
        { selectedSlugName },
      );
    return '';
  }, [stepNumber]);

  const convertHierarhyToUIComponent = (hierarchy, isTargetRender) => {
    const recursiveConvertToUIComponent = (parentKey, rootComponent) => {
      const [entryKey, entryValue] = rootComponent;
      if (!entryValue) return;
      const {
        container,
        id,
        displayName,
        allowedComponents: _a,
        _foundComponents,
        ...rest
      } = entryValue;

      const key = `${parentKey}.${entryKey}`;
      const label = displayName ? `${displayName}-${id}` : entryKey;
      // const margin = parentKey.split('.').length - 1;
      if (isTargetRender)
        return (
          <>
            <Box marginLeft="1.2rem">
              <Radio value={key} disabled={!container}>
                <RadioTypography>{label}</RadioTypography>
              </Radio>
              {Object.entries(rest).map((entry) =>
                recursiveConvertToUIComponent(key, entry),
              )}
            </Box>
          </>
        );
      else
        return (
          <>
            <Box marginLeft="1.2rem">
              {(!_foundComponents || isArray(_foundComponents)) && (
                <>
                  <Radio value={key} disabled>
                    <RadioTypography>{label}</RadioTypography>
                  </Radio>
                  {_foundComponents && (
                    <Box marginLeft="1.2rem">
                      {_foundComponents.map((entry, idx) => (
                        <Radio
                          key={`${key}.${idx}`}
                          value={`${key}._foundComponents.${idx}`}
                        >
                          <RadioTypography>{entry.displayName}</RadioTypography>
                        </Radio>
                      ))}
                    </Box>
                  )}
                </>
              )}
              {_foundComponents && !isArray(_foundComponents) && (
                <Radio value={`${key}._foundComponents`}>
                  <RadioTypography>
                    {`(${label}) ${_foundComponents.displayName}`}
                  </RadioTypography>
                </Radio>
              )}
              {Object.entries(rest).map((entry) =>
                recursiveConvertToUIComponent(key, entry),
              )}
            </Box>
          </>
        );
    };
    return (
      <Box marginLeft="-1.2rem">
        {Object.entries(hierarchy).map((entry) =>
          recursiveConvertToUIComponent('', entry),
        )}
      </Box>
    );
  };

  const getModalBody = () => {
    if (isLoading) return <Loader>Loading...</Loader>;
    if (stepNumber === Steps.TargetContainer)
      return (
        <Box minWidth="100%">
          <RadioGroup
            onChange={(e) => setSelectedTarget(e.target.value)}
            value={selectedTarget}
          >
            {convertHierarhyToUIComponent(targetSectionHierarchy, true)}
          </RadioGroup>
        </Box>
      );
    if (stepNumber === Steps.SourceType)
      return (
        <Box minWidth="100%">
          <Select
            placeholder={formatMessage({
              id: getTrad('modal.placeholder.sourcetype'),
            })}
            value={tmpSelectedSourceType}
            onChange={setTmpSelectedSourceType}
          >
            {allSourceLayouts &&
              Object.entries(allSourceLayouts).map(([uid, layout]) => (
                <Option key={uid} value={uid}>
                  {layout.contentType.info.displayName}
                </Option>
              ))}
          </Select>
        </Box>
      );
    if (stepNumber === Steps.SourceSlug)
      return (
        <Box minWidth="100%">
          <Select
            placeholder={formatMessage({
              id: getTrad('modal.placeholder.slug'),
            })}
            value={tmpSelectedSlug}
            onChange={setTmpSelectedSlug}
          >
            {availableSlugs.map((s) => (
              <Option key={s.id} value={s.id}>
                {s.displayName}
              </Option>
            ))}
          </Select>
        </Box>
      );
    if (stepNumber === Steps.Component)
      return (
        <Box minWidth="100%">
          <RadioGroup
            onChange={(e) => setTmpSelectedComponent(e.target.value)}
            value={tmpSelectedComponent}
          >
            {convertHierarhyToUIComponent(availableComponents, false)}
          </RadioGroup>
        </Box>
      );
    return <></>;
  };

  return (
    <Dialog onClose={handleCancel} title={getModalTitle} isOpen={isOpen}>
      <ModifiedDialogBody isLoading={isLoading}>
        <Flex direction="column" alignItems="center" gap={2}>
          {getModalBody()}
        </Flex>
      </ModifiedDialogBody>
      <DialogFooter
        startAction={
          <Button
            onClick={handleCancel}
            variant="tertiary"
            disabled={isLoading}
          >
            {formatMessage({
              id: getTrad('modal.button.cancel'),
              defaultMessage: 'Cancel',
            })}
          </Button>
        }
        endAction={
          <Button
            onClick={handleNext}
            variant="success-light"
            endIcon={
              stepNumber === Steps.Component ? <Check /> : <ChevronRight />
            }
            disabled={isLoading || !canProceed()}
          >
            {stepNumber === Steps.Component
              ? formatMessage({
                  id: getTrad('modal.button.confirm'),
                  defaultMessage: 'Confirm',
                })
              : formatMessage({
                  id: getTrad('modal.button.next'),
                  defaultMessage: 'Next',
                })}
          </Button>
        }
      />
    </Dialog>
  );
};

CopyModal.defaultProps = {
  allLocales: [],
  existingLocales: [],
};

CopyModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default CopyModal;
