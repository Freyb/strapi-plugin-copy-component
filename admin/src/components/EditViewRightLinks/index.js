import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import {
  useNotification,
  useCMEditViewDataManager,
} from '@strapi/helper-plugin';
import { makeSelectModelAndComponentSchemas } from '@strapi/admin/admin/src/content-manager/pages/App/selectors';

import PreviewButton from '../PreviewButton';
import CopyModal from '../CopyModal';
import getTrad from '../../utils/getTrad';
import useConfig from '../../hooks/useConfig';

const EditViewRightLinks = () => {
  const toggleNotification = useNotification();
  const dispatch = useDispatch();
  const cmdatamanager = useCMEditViewDataManager();
  const uid = cmdatamanager.allLayoutData.contentType.uid;
  const { config, isLoading: configIsLoading } = useConfig();

  const schemasSelector = useMemo(makeSelectModelAndComponentSchemas, []);
  const { schemas } = useSelector(
    (state) => schemasSelector(state),
    shallowEqual,
  );

  const currentConfig = useMemo(
    () =>
      config.contentTypes.filter((c) =>
        typeof c === 'string' ? c === uid : c.uid === uid,
      )[0],
    [config],
  );
  const allowedSourceTypes = useMemo(
    () =>
      currentConfig &&
      (typeof currentConfig === 'string'
        ? [currentConfig]
        : currentConfig.source),
    [currentConfig],
  );
  const allowedEntity = useMemo(
    () => !configIsLoading && !!currentConfig,
    [configIsLoading, currentConfig],
  );

  const [isModalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toggleModal = () => setModalOpen((s) => !s);

  const handleButtonClick = () => {
    toggleModal();
  };

  const handleSubmit = (cleanedData) => {
    setIsLoading(true);
    dispatch({
      type: 'ContentManager/CrudReducer/GET_DATA_SUCCEEDED',
      data: cleanedData,
      setModifiedDataOnly: true,
    });
    toggleNotification({
      type: 'success',
      message: {
        id: getTrad('notification.generate.success'),
        defaultMessage: 'Success',
      },
    });
    setIsLoading(false);
    toggleModal();
  };

  const handleCancel = () => {
    if (!isLoading) toggleModal();
  };
  if (!allowedEntity) return null;

  return (
    <>
      <PreviewButton onClick={handleButtonClick} />
      <CopyModal
        isOpen={isModalOpen}
        onClose={handleCancel}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        allowedSourceTypes={allowedSourceTypes}
        schemas={schemas}
      />
    </>
  );
};

export default EditViewRightLinks;
