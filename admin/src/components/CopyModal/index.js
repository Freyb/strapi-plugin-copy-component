import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { get, set } from 'lodash';
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
// import { getMaxTempKey } from '@strapi/admin/admin/src/content-manager/utils';
import { cleanData } from '@strapi/plugin-i18n/admin/src/components/CMEditViewInjectedComponents/CMEditViewCopyLocale/utils';

const Steps = {
  TargetContainer: 'TargetContainer',
  SourceType: 'SourceType',
  SourceSlug: 'SourceSlug',
  Component: 'Component',
};

const discoverRepeatableChildren = (rootComponent, components) => {
  const recursiveDisvoverRepeatableChildren = (component) => {
    const layout = getComponentLayout(components, component);
    const result = Object.entries(layout.attributes).reduce(
      (acc, [currKey, currValue]) => {
        if (currValue.type === 'component') {
          const subComponentResult = recursiveDisvoverRepeatableChildren(
            currValue.component,
          );
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
  return {
    ...recursiveDisvoverRepeatableChildren(rootComponent),
    uid: rootComponent,
  };
};

const discoverTargetContainers = ({ contentType, components }, contentData) => {
  const recursiveDiscoverOfComponents = (componentHierarchy, componentData) => {
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
            attrAcc[key] = recursiveDiscoverOfComponents(
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
          attrAcc[key] = recursiveDiscoverOfComponents(
            value,
            componentData[key],
          );
          return attrAcc;
        }, {}),
        container: false,
      };
    }
  };

  const prepareDynamicZone = (componentData) => {
    const componentDataFiltered = componentData.filter((c) =>
      c.hasOwnProperty('id'),
    );
    if (componentDataFiltered.length == 0) return {};

    return {
      ...componentDataFiltered.map((_componentData) => {
        const componentHierarchy = discoverRepeatableChildren(
          _componentData.__component,
          components,
        );
        const { repeatable: _r, uid: _u, ...rest } = componentHierarchy;
        if (Object.keys(rest).length === 0) return null;
        return recursiveDiscoverOfComponents(
          componentHierarchy,
          _componentData,
        );
      }),
      container: true,
    };
  };

  const rootContainers = Object.entries(contentType.attributes).reduce(
    (acc, [currKey, currValue]) => {
      if (currValue.type === 'dynamiczone') {
        acc[currKey] = {
          ...prepareDynamicZone(contentData[currKey]),
          allowedComponents: currValue.components,
        };
      }
      if (currValue.type === 'component' && currValue.repeatable === true) {
        acc[currKey] = recursiveDiscoverOfComponents(
          {
            ...discoverRepeatableChildren(currValue.component, components),
            repeatable: true,
          },
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
  // const { contentType: currentContentType, components: currentComponents } =
  //   allLayoutData;
  console.log('allLayoutData', allLayoutData);
  console.log('modifiedData', modifiedData);
  // const { attributes: currentAttributes } = currentContentType;

  // Step number
  const [stepNumber, setStepNumber] = useState(Steps.TargetContainer);

  // Select target container
  const targetSectionHierarchy = useMemo(
    () => discoverTargetContainers(allLayoutData, initialData),
    [allLayoutData, initialData],
  );
  console.log(targetSectionHierarchy);

  // const targetSections = useMemo(
  //   () =>
  //     Object.entries(currentAttributes)
  //       .filter(([_key, value]) => value.type === 'dynamiczone')
  //       .map(([key, _value]) => key),
  //   [currentAttributes],
  // );
  const [selectedTarget, setSelectedTarget] = useState('');

  // Select source type
  const [tmpSelectedSourceType, setTmpSelectedSourceType] = useState('');
  const [selectedSourceType, setSelectedSourceType] = useState('');
  const [sourceLayout, setSourceLayout] = useState();

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

  // Fetch slugs and layout of source uid
  useEffect(async () => {
    if (selectedSourceType) {
      try {
        // Get layout
        const _sourceLayout = await getSourceLayout(
          selectedSourceType,
          schemas,
        );
        setSourceLayout(_sourceLayout);

        // Get slugs
        const { entities } = await dataProxy.getSlugs(selectedSourceType);
        setAvailableSlugs(
          entities
            .filter((e) => e.id !== modifiedData.id)
            .map((e) => ({
              ...e,
              displayName: getDisplayName(_sourceLayout.contentType, e, false),
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
    if (selectedSourceType && selectedSlug) {
      dataProxy
        .getComponents(selectedSourceType, selectedSlug)
        .then(({ entity }) => {
          if (entity) {
            const cleanedData = cleanData(
              entity,
              allLayoutData,
              entity.localizations,
            );

            setAvailableComponents(
              // TODO: Fetch it from source container
              get(cleanedData, ['Content']).map((c, idx) => ({
                ...c,
                displayName: getDisplayName(
                  getComponentLayout(sourceLayout.components, c.__component),
                  c,
                ),
                index: `${idx}`,
              })),
            );
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
      const selectedComponent = availableComponents.find(
        (x) => x.index === tmpSelectedComponent,
      );

      const fieldsToRemove = ['index', 'displayName'];
      const cleanedComponent = Object.fromEntries(
        Object.entries(selectedComponent).filter(
          ([key, _value]) => !fieldsToRemove.includes(key),
        ),
      );

      const cleanedData = { ...modifiedData };
      const selectedTargetPath = selectedTarget.split('.').slice(1);
      set(cleanedData, selectedTargetPath, [
        ...get(modifiedData, selectedTargetPath),
        cleanedComponent,
      ]);

      onSubmit(cleanedData);
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

  const convertHierarhyToUIComponent = (hierarchy) => {
    const recursiveConvertToUIComponent = (parentKey, rootComponent) => {
      const [entryKey, entryValue] = rootComponent;
      if (!entryValue) return;
      const { container, id, displayName, allowedComponents, ...rest } =
        entryValue;

      const key = `${parentKey}.${entryKey}`;
      const label = displayName ? `${displayName}-${id}` : entryKey;
      const margin = parentKey.split('.').length - 1;
      return (
        <>
          <Box marginLeft={`${margin * 1.2}rem`}>
            <Radio key={key} value={key} disabled={!container}>
              <RadioTypography>{label}</RadioTypography>
            </Radio>
          </Box>
          {Object.entries(rest).map((entry) =>
            recursiveConvertToUIComponent(key, entry),
          )}
        </>
      );
    };
    return (
      <>
        {Object.entries(hierarchy).map((entry) =>
          recursiveConvertToUIComponent('', entry),
        )}
      </>
    );
  };

  console.log(selectedTarget);

  const getModalBody = () => {
    if (isLoading) return <Loader>Loading...</Loader>;
    if (stepNumber === Steps.TargetContainer)
      return (
        <Box minWidth="100%">
          <RadioGroup
            onChange={(e) => setSelectedTarget(e.target.value)}
            value={selectedTarget}
          >
            {convertHierarhyToUIComponent(targetSectionHierarchy)}
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
            {allowedSourceTypes.map((s) => (
              <Option key={s} value={s}>
                {s}
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
          <Select
            placeholder={formatMessage({
              id: getTrad('modal.placeholder.component'),
            })}
            value={tmpSelectedComponent}
            onChange={setTmpSelectedComponent}
          >
            {availableComponents.map((c) => (
              <Option key={c.index} value={c.index}>
                {c.displayName}
              </Option>
            ))}
          </Select>
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
