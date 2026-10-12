import base  from '@reliquary/eslint-config';
import react from '@reliquary/eslint-config-react';

export default [
  ...base,
  ...react,
  { ignores: ['.data/**'] },
];
