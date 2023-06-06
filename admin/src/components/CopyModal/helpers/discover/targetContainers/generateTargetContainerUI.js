import React from 'react';
import { isEmpty } from 'lodash';
import { useIntl } from 'react-intl';
import { Box, Radio } from '@strapi/design-system';
import { RadioTypography } from '../../UIComponents';
import getTrad from '../../../../../utils/getTrad';

const generateTargetContainerUI = (hierarchy) => {
  const { formatMessage } = useIntl();

  const recursiveConvertToUIComponent = (parentKey, rootComponent) => {
    const [entryKey, entryValue] = rootComponent;
    if (!entryValue) return;
    const {
      container,
      displayName,
      id: _id,
      allowedComponents: _a,
      _foundComponents,
      ...rest
    } = entryValue;

    const key = `${parentKey}.${entryKey}`;
    const label = displayName ? displayName : entryKey;

    return (
      <React.Fragment key={key}>
        <Box marginLeft="1.2rem">
          <Radio value={key} disabled={!container}>
            <RadioTypography>{label}</RadioTypography>
          </Radio>
          {Object.entries(rest).map((entry) =>
            recursiveConvertToUIComponent(key, entry),
          )}
        </Box>
      </React.Fragment>
    );
  };
  if (isEmpty(hierarchy))
    return (
      <Box textAlign="center">
        {formatMessage({
          id: getTrad('modal.target.nocontainer'),
        })}
      </Box>
    );
  return (
    <Box marginLeft="-1.2rem">
      {Object.entries(hierarchy).map((entry) =>
        recursiveConvertToUIComponent('', entry),
      )}
    </Box>
  );
};

export default generateTargetContainerUI;
