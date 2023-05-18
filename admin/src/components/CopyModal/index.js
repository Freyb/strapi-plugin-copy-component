import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  useNotification,
  useCMEditViewDataManager,
} from '@strapi/helper-plugin';
import {
  Dialog,
  //   DialogBody,
  DialogFooter,
  Flex,
  Typography,
  Button,
  Box,
  Icon,
  Loader,
  Select,
  Option,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { Duplicate, Earth } from '@strapi/icons';
import getTrad from '../../utils/getTrad';
import dataProxy from '../../proxy/DataProxy';

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
  const { allLayoutData } = useCMEditViewDataManager();
  const {
    contentType: { attributes },
  } = allLayoutData;

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

  useEffect(() => {
    if (uid) {
      dataProxy
        .getSlugs(uid)
        .then((result) => {
          console.log('Available slugs', result);
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
          console.log('Slug components', result);
        })
        .catch((_e) => {
          console.log(_e);
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
    setStepNumber(Steps.Target);
    onClose();
  };

  const handleNext = () => {
    if (stepNumber === Steps.Target) {
      if (selectedTarget !== '') {
        setStepNumber(Steps.Slug);
      }
    } else if (stepNumber === Steps.Slug) {
      if (tmpSelectedSlug !== '') {
        setSelectedSlug(tmpSelectedSlug);
        setStepNumber(Steps.Component);
      }
    } else console.log('Finished');
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
    return <Box>Hello</Box>;
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
            startIcon={<Duplicate />}
            disabled={isLoading}
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
