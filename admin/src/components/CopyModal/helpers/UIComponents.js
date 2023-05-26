import React from 'react';
import styled from 'styled-components';
import { Flex, Box, Typography } from '@strapi/design-system';

const WrappedButton = styled(Box)`
  svg {
    width: ${({ theme: e }) => e.spaces[6]};
    height: ${({ theme: e }) => e.spaces[6]};
  }
`;
const ModifiedDialogBody = ({ children, icon, isLoading }) => {
  return (
    <Box
      paddingTop="8"
      paddingBottom="8"
      paddingLeft="6"
      paddingRight="6"
      maxHeight="20rem"
      style={{ overflowY: 'auto' }}
    >
      {!isLoading && icon && (
        <WrappedButton paddingBottom="2">
          <Flex justifyContent="center">{icon}</Flex>
        </WrappedButton>
      )}
      <>{children}</>
    </Box>
  );
};

const RadioTypography = styled(Typography)`
  display: inline-block;
  line-height: 1.5;
  font-size: 1rem;
  color: initial;
`;

export { ModifiedDialogBody, RadioTypography };
