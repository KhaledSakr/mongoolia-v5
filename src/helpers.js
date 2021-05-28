import { merge } from 'lodash';

const pickByPath = (obj, path) => {
  if (!obj || !path || typeof obj !== 'object') {
    return obj;
  }
  const [firstPath, ...rest] = path.split('.');
  return Array.isArray(obj)
    ? obj.map(item => pickByPath(item, firstPath))
    : Object.fromEntries(
        Object.entries(obj)
          .filter(([key]) => key === firstPath)
          .map(([key, value]) => [key, pickByPath(value, rest.join('.'))])
      );
};

export const pick = (obj, paths) => {
  return merge(...paths.map(path => pickByPath(obj, path)));
};
