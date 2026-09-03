import '@testing-library/jest-dom';
import { UNSTABLE_usePreventRouterReset } from 'react-router-dom';

// Configure Router future flags for test router setups if needed, 
// or suppress React Router warnings globally in testing environment console.
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && args[0].includes('React Router Future Flag Warning')) {
    return;
  }
  originalWarn(...args);
};
