import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  useNotification,
  useCMEditViewDataManager,
} from '@strapi/helper-plugin';

import PreviewButton from '../PreviewButton';
import CopyModal from '../CopyModal';
import getTrad from '../../utils/getTrad';

const EditViewRightLinks = () => {
  const toggleNotification = useNotification();
  const dispatch = useDispatch();
  const cmdatamanager = useCMEditViewDataManager();
  const uid = cmdatamanager.allLayoutData.contentType.uid;

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

  return (
    <>
      <PreviewButton onClick={handleButtonClick} />
      <CopyModal
        isOpen={isModalOpen}
        onClose={handleCancel}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        uid={uid}
      />
    </>
  );
};

export default EditViewRightLinks;
