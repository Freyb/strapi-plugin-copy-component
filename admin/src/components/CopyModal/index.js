import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { get, set } from 'lodash';
import { useDispatch } from 'react-redux';
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

const CopyModal = ({ isOpen, onClose, onSubmit, isLoading, uid }) => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const dispatch = useDispatch();
  const xx = useCMEditViewDataManager();
  const { allLayoutData, modifiedData } = xx;
  const {
    contentType: { attributes },
    components,
  } = allLayoutData;
  const getComponentLayout = (componentUid) => {
    return components?.[componentUid] ?? {};
  };

  const [stepNumber, setStepNumber] = useState(Steps.Target);

  const targetSections = useMemo(
    () =>
      Object.entries(attributes)
        .filter(([_key, value]) => value.type === 'dynamiczone')
        .map(([key, _value]) => key),
    [attributes],
  );
  const [selectedTarget, setSelectedTarget] = useState('');

  const [availableSlugs, setAvailableSlugs] = useState([]);
  const [tmpSelectedSlug, setTmpSelectedSlug] = useState('');
  const [selectedSlug, setSelectedSlug] = useState('');
  const selectedSlugName = useMemo(
    () => availableSlugs.find((x) => x.id === selectedSlug)?.Slug || '',
    [availableSlugs, selectedSlug],
  );

  const [availableComponents, setAvailableComponents] = useState([]);
  const [tmpSelectedComponent, setTmpSelectedComponent] = useState('');

  const getDisplayName = (component) => {
    const componentLayoutData = getComponentLayout(component.__component);

    const displayName = componentLayoutData.info.displayName;

    const mainFieldKey =
      get(componentLayoutData, ['options', 'mainField']) ||
      get(componentLayoutData, ['settings', 'mainField'], 'id');

    const mainField = Array.isArray(mainFieldKey)
      ? mainFieldKey
          .map(
            (_mainFieldKey) =>
              get(component, [..._mainFieldKey.split('.')]) ?? '',
          )
          .filter((k) => k.length > 0)
          .join(' - ')
      : get(component, [...mainFieldKey.split('.')]) ?? '';

    const displayedValue =
      mainFieldKey === 'id' ? '' : String(mainField).trim();

    const mainValue =
      displayedValue.length > 0 ? ` - ${displayedValue}` : displayedValue;

    const combinedName = `${displayName}${mainValue}`;
    return combinedName;
  };

  useEffect(() => {
    if (uid) {
      dataProxy
        .getSlugs(uid)
        .then((result) => {
          setAvailableSlugs(result.slugs);
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
        .getComponents(uid, selectedSlug, selectedTarget)
        .then((result) => {
          setAvailableComponents(
            result.components.map((c, idx) => ({
              ...c,
              displayName: getDisplayName(c),
              index: `${idx}`,
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

      const fieldsToRemove = ['id', 'index', 'displayName'];
      const cleanedComponent = {
        ...Object.fromEntries(
          Object.entries(selectedComponent).filter(
            ([key, _value]) => !fieldsToRemove.includes(key),
          ),
        ),
        __temp_key__: getMaxTempKey(modifiedData[selectedTarget]) + 1,
      };

      const cleanedData = { ...modifiedData };
      set(
        cleanedData,
        [selectedTarget],
        [...modifiedData[selectedTarget], cleanedComponent],
      );

      dispatch({
        type: 'ContentManager/CrudReducer/GET_DATA_SUCCEEDED',
        data: cleanedData,
        setModifiedDataOnly: true,
      });
    }
  };

  const getModalTitle = useMemo(() => {
    if (stepNumber == Steps.Target) return 'Select target container';
    if (stepNumber == Steps.Slug) return 'Select slug';
    if (stepNumber == Steps.Component)
      return `Select component from ${selectedSlugName}`;
    return '';
  }, [stepNumber]);

  const getModalBody = () => {
    if (isLoading) return <Loader>Loading...</Loader>;
    if (stepNumber === Steps.Target)
      return (
        <Box minWidth="100%">
          <Select
            label="Target"
            placeholder="Select target container..."
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
            label="Slug"
            placeholder="Select source slug..."
            value={tmpSelectedSlug}
            onChange={setTmpSelectedSlug}
          >
            {availableSlugs.map((s) => (
              <Option key={s.id} value={s.id}>
                {s.Slug}
              </Option>
            ))}
          </Select>
        </Box>
      );
    if (stepNumber === Steps.Component)
      return (
        <Box minWidth="100%">
          <Select
            label="Component"
            placeholder="Select component..."
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
