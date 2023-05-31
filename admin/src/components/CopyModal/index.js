import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { get, set, cloneDeep, orderBy } from 'lodash';
import {
  useNotification,
  useCMEditViewDataManager,
} from '@strapi/helper-plugin';
import {
  Dialog,
  DialogFooter,
  Flex,
  Button,
  Box,
  Loader,
  Select,
  Option,
  RadioGroup,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { ChevronRight, Check } from '@strapi/icons';
import getTrad from '../../utils/getTrad';
import dataProxy from '../../proxy/DataProxy';
import {
  getDisplayName,
  ModifiedDialogBody,
  getSourceLayout,
  discoverTargetContainers,
  discoverSourceComponents,
  generateTargetContainerUI,
  generateSourceComponentUI,
} from './helpers';
import { getMaxTempKey } from '@strapi/admin/admin/src/content-manager/utils';
import { cleanData } from '@strapi/plugin-i18n/admin/src/components/CMEditViewInjectedComponents/CMEditViewCopyLocale/utils';

const Steps = {
  TargetContainer: 'TargetContainer',
  SourceType: 'SourceType',
  SourceSlug: 'SourceSlug',
  Component: 'Component',
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
  const targetContainerHierarchy = useMemo(
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
  const [sourceComponentHierarchy, setSourceComponentHierarchy] = useState([]);
  const [tmpSelectedComponent, setTmpSelectedComponent] = useState('');

  // Modal initialization
  const initializeModal = () => {
    setStepNumber(Steps.TargetContainer);
    setSelectedTarget('');
    setTmpSelectedSourceType('');
    setSelectedSourceType('');
    setTmpSelectedSlug('');
    setSelectedSlug('');
    setTmpSelectedComponent('');
  };

  useEffect(() => {
    initializeModal();
  }, []);

  // Fetch source layouts at startup
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

  // Fetch slugs when source type is chosen
  useEffect(async () => {
    if (selectedSourceType && allSourceLayouts) {
      try {
        // Get layout
        const sourceLayout = allSourceLayouts[selectedSourceType];

        // Get slugs
        const { entities } = await dataProxy.getSlugs(selectedSourceType);
        setAvailableSlugs(
          orderBy(
            entities
              .filter((e) => e.id !== modifiedData.id)
              .map((e) => ({
                ...e,
                displayName: getDisplayName(sourceLayout.contentType, e, false),
              })),
            ['displayName'],
            ['asc'],
          ),
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

  // Fetch components when souce slug is chosen
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
              get(targetContainerHierarchy, selectedTargetPath)
                .allowedComponents,
            );
            setSourceComponentHierarchy(sourceComponents);
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
      const selectedComponent = get(
        sourceComponentHierarchy,
        sourceComponentPath,
      );

      const newContentData = cloneDeep(modifiedData);
      const originalTargetData = get(modifiedData, selectedTargetPath, []);

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

  const getModalBody = () => {
    if (isLoading) return <Loader>Loading...</Loader>;
    if (stepNumber === Steps.TargetContainer)
      return (
        <Box minWidth="100%">
          <RadioGroup
            onChange={(e) => setSelectedTarget(e.target.value)}
            value={selectedTarget}
          >
            {generateTargetContainerUI(targetContainerHierarchy)}
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
            {generateSourceComponentUI(sourceComponentHierarchy)}
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
