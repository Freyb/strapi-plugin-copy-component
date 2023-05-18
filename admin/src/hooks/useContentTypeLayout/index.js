import { useCallback } from 'react';
import { useSelector } from 'react-redux';

const selectLayout = (state) =>
  state['content-manager_editViewLayoutManager'].currentLayout;

const useContentTypeLayout = () => {
  const currentLayout = useSelector(selectLayout);

  const getComponentLayout = useCallback(
    (componentUid) => {
      return currentLayout?.components?.[componentUid] ?? {};
    },
    [currentLayout],
  );

  return { ...currentLayout, getComponentLayout };
};

export default useContentTypeLayout;
