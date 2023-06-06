import React from 'react';
import { Box, Radio } from '@strapi/design-system';
import { RadioTypography } from '../../UIComponents';

const generateTargetContainerUI = (hierarchy) => {
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
  return (
    <Box marginLeft="-1.2rem">
      {Object.entries(hierarchy).map((entry) =>
        recursiveConvertToUIComponent('', entry),
      )}
    </Box>
  );
};

export default generateTargetContainerUI;
