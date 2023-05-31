import React from 'react';
import { Box, Radio } from '@strapi/design-system';
import { isArray } from 'lodash';
import { RadioTypography } from '../../UIComponents';

const generateSourceComponentUI = (hierarchy) => {
  const recursiveConvertToUIComponent = (parentKey, rootComponent) => {
    const [entryKey, entryValue] = rootComponent;
    if (!entryValue) return;
    const {
      container: _c,
      displayName,
      id: _id,
      allowedComponents: _a,
      _foundComponents,
      ...rest
    } = entryValue;

    const key = `${parentKey}.${entryKey}`;
    const label = displayName ? displayName : entryKey;

    return (
      <>
        <Box marginLeft="1.2rem">
          {(!_foundComponents || isArray(_foundComponents)) && (
            <>
              <Radio value={key} disabled>
                <RadioTypography>{label}</RadioTypography>
              </Radio>
              {_foundComponents && (
                <Box marginLeft="1.2rem">
                  {_foundComponents.map((entry, idx) => (
                    <Radio
                      key={`${key}.${idx}`}
                      value={`${key}._foundComponents.${idx}`}
                    >
                      <RadioTypography>{entry.displayName}</RadioTypography>
                    </Radio>
                  ))}
                </Box>
              )}
            </>
          )}
          {_foundComponents && !isArray(_foundComponents) && (
            <Radio value={`${key}._foundComponents`}>
              <RadioTypography>{_foundComponents.displayName}</RadioTypography>
            </Radio>
          )}
          {Object.entries(rest).map((entry) =>
            recursiveConvertToUIComponent(key, entry),
          )}
        </Box>
      </>
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

export default generateSourceComponentUI;
