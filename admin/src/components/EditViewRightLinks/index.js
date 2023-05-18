import React, { useState } from 'react';
import {
  useNotification,
  useCMEditViewDataManager,
  useRBACProvider,
} from '@strapi/helper-plugin';
import { request } from '@strapi/helper-plugin';
import isEqual from 'lodash/isEqual';

import PreviewButton from '../PreviewButton';
import CopyModal from '../CopyModal';
import { pluginId } from '../../pluginId';
import getTrad from '../../utils/getTrad';
import useLocales from '../../hooks/useLocales';
import useGetLocalizations from '../../hooks/useLocalizations';
import useContentTypePermissions from '../../hooks/useContentTypePermissions';
import { cleanData } from '@strapi/plugin-i18n/admin/src/components/CMEditViewInjectedComponents/CMEditViewCopyLocale/utils';

const EditViewRightLinks = () => {
  const toggleNotification = useNotification();
  const cmdatamanager = useCMEditViewDataManager();
  const { refetchPermissions } = useRBACProvider();

  const { allLayoutData, isCreatingEntry, initialData, modifiedData } =
    cmdatamanager;
  const { contentType } = allLayoutData;
  const { uid } = contentType;

  const [isModalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toggleModal = () => setModalOpen((s) => !s);

  const handleButtonClick = () => {
    toggleModal();
  };

  const handleSubmit = (values) => {
    setIsLoading(true);
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
