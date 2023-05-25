import { get } from 'lodash';

const getDisplayName = (layoutData, contentData, withDisplayName = true) => {
  const displayName = layoutData.info.displayName;

  const mainFieldKey =
    get(layoutData, ['options', 'mainField']) ||
    get(layoutData, ['settings', 'mainField'], 'id');

  const mainField = Array.isArray(mainFieldKey)
    ? mainFieldKey
        .map(
          (_mainFieldKey) =>
            get(contentData, [..._mainFieldKey.split('.')]) ?? '',
        )
        .filter((k) => k.length > 0)
        .join(' - ')
    : get(contentData, [...mainFieldKey.split('.')]) ?? '';

  const displayedValue = mainFieldKey === 'id' ? '' : String(mainField).trim();

  const mainValue =
    displayedValue.length > 0 ? ` - ${displayedValue}` : displayedValue;

  const combinedName = withDisplayName
    ? `${displayName}${mainValue}`
    : displayedValue;
  return combinedName;
};

export default getDisplayName;
