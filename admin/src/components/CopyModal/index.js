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
  // Typography,
  Button,
  Box,
  Icon,
  Loader,
  Select,
  Option,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { ChevronRight, Check, Earth } from '@strapi/icons';
import getTrad from '../../utils/getTrad';
import dataProxy from '../../proxy/DataProxy';
import { getMaxTempKey } from '@strapi/admin/admin/src/content-manager/utils';
import { cleanData } from '@strapi/plugin-i18n/admin/src/components/CMEditViewInjectedComponents/CMEditViewCopyLocale/utils';

const WrappedButton = styled(Box)`
  svg {
    width: ${({ theme: e }) => e.spaces[6]};
    height: ${({ theme: e }) => e.spaces[6]};
  }
`;
const ModifiedDialogBody = ({ children, icon, isLoading }) => {
  return (
    <Box paddingTop="8" paddingBottom="8" paddingLeft="6" paddingRight="6">
      {!isLoading && (
        <WrappedButton paddingBottom="2">
          <Flex justifyContent="center">{icon}</Flex>
        </WrappedButton>
      )}
      <>{children}</>
    </Box>
  );
};

const Steps = {
  Target: 'Target',
  Uid: 'Uid',
  Slug: 'Slug',
  Component: 'Component',
};

const getComponentLayout = (allComponents, componentUid) => {
  return allComponents?.[componentUid] ?? {};
};

const getDisplayName = (layoutData, contentData, withDisplayName = true) => {
  const displayName = layoutData.info.displayName;

  const mainFieldKey =
    get(layoutData, ['options', 'mainField']) ||
    get(layoutData, ['settings', 'mainField'], 'id');

  const mainField = Array.isArray(mainFieldKey)
    ? mainFieldKey
        .map(
          (_mainFieldKey) =>
            get(contentData, [..._mainFieldKey.split('.')]) ?? '',
        )
        .filter((k) => k.length > 0)
        .join(' - ')
    : get(contentData, [...mainFieldKey.split('.')]) ?? '';

  const displayedValue = mainFieldKey === 'id' ? '' : String(mainField).trim();

  const mainValue =
    displayedValue.length > 0 ? ` - ${displayedValue}` : displayedValue;

  const combinedName = withDisplayName
    ? `${displayName}${mainValue}`
    : displayedValue;
  return combinedName;
};

const CopyModal = ({ isOpen, onClose, onSubmit, isLoading, uid }) => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { allLayoutData, modifiedData } = useCMEditViewDataManager();
  const { contentType, components } = allLayoutData;
  const { attributes } = contentType;

  // Step number
  const [stepNumber, setStepNumber] = useState(Steps.Target);

  // Select target container
  const targetSections = useMemo(
    () =>
      Object.entries(attributes)
        .filter(([_key, value]) => value.type === 'dynamiczone')
        .map(([key, _value]) => key),
    [attributes],
  );
  const [selectedTarget, setSelectedTarget] = useState('');

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

  useEffect(() => {
    if (uid) {
      dataProxy
        .getSlugs(uid)
        .then(({ entities }) => {
          setAvailableSlugs(
            entities
              .filter((e) => e.id !== modifiedData.id)
              .map((e) => ({
                ...e,
                displayName: getDisplayName(contentType, e, false),
              })),
          );
        })
        .catch((_e) => {
          toggleNotification({
            type: 'warning',
            message: { id: 'notification.error' },
          });
        });
    }
  }, [uid]);

  useEffect(() => {
    if (selectedSlug) {
      dataProxy
        .getComponents(uid, selectedSlug)
        .then(({ entity }) => {
          if (entity) {
            const cleanedData = cleanData(
              entity,
              allLayoutData,
              entity.localizations,
            );

            setAvailableComponents(
              cleanedData[selectedTarget].map((c, idx) => ({
                ...c,
                displayName: getDisplayName(
                  getComponentLayout(components, c.__component),
                  c,
                ),
                index: `${idx}`,
              })),
            );
          }
        })
        .catch((_e) => {
          toggleNotification({
            type: 'warning',
            message: { id: 'notification.error' },
          });
        });
    }
  }, [selectedSlug]);

  const handleCancel = () => {
    setSelectedTarget('');
    setTmpSelectedSlug('');
    setSelectedSlug('');
    setTmpSelectedComponent('');
    setStepNumber(Steps.Target);
    onClose();
  };

  const canProceed = () => {
    return (
      (stepNumber === Steps.Target && selectedTarget !== '') ||
      (stepNumber === Steps.Slug && tmpSelectedSlug !== '') ||
      (stepNumber === Steps.Component && tmpSelectedComponent !== '')
    );
  };

  const handleNext = () => {
    if (!canProceed()) return;

    if (stepNumber === Steps.Target) {
      setStepNumber(Steps.Slug);
    } else if (stepNumber === Steps.Slug) {
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
      set(
        cleanedData,
        [selectedTarget],
        [...modifiedData[selectedTarget], cleanedComponent],
      );

      onSubmit(cleanedData);
    }
  };

  const getModalTitle = useMemo(() => {
    if (stepNumber == Steps.Target)
      return formatMessage({
        id: getTrad('modal.title.target'),
      });
    if (stepNumber == Steps.Slug)
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
    if (stepNumber === Steps.Target)
      return (
        <Box minWidth="100%">
          <Select
            placeholder={formatMessage({
              id: getTrad('modal.placeholder.target'),
            })}
            value={selectedTarget}
            onChange={setSelectedTarget}
          >
            {targetSections.map((s) => (
              <Option key={s} value={s}>
                {s}
              </Option>
            ))}
          </Select>
        </Box>
      );
    if (stepNumber === Steps.Slug)
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
    <Dialog onClose={onClose} title={getModalTitle} isOpen={isOpen}>
      <ModifiedDialogBody
        icon={<Icon width={`3rem`} height={`3rem`} as={Earth} />}
        isLoading={isLoading}
      >
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
