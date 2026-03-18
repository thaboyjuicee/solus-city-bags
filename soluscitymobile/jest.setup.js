jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-worklets', () => ({
  Worklets: {},
  createWorkletRuntime: () => ({}),
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text, Image, ScrollView } = require('react-native');

  const Animated = {
    View,
    Text,
    Image,
    ScrollView,
    createAnimatedComponent: (Component) => Component,
  };

  return {
    __esModule: true,
    default: Animated,
    useSharedValue: (value) => ({ value }),
    useAnimatedStyle: (updater) => updater(),
    useDerivedValue: (updater) => ({ value: updater() }),
    useAnimatedProps: (updater) => updater(),
    withTiming: (value) => value,
    withSpring: (value) => value,
    withSequence: (...values) => values[values.length - 1],
    withRepeat: (value) => value,
    cancelAnimation: () => {},
    runOnJS: (fn) => fn,
    interpolate: (_value, _input, output) => output[0],
    Extrapolation: { CLAMP: 'clamp' },
    Easing: { linear: () => {} },
  };
});

jest.mock('react-native-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children, ...props }) => React.createElement(View, props, children);
});

jest.mock('@solana-mobile/mobile-wallet-adapter-protocol-web3js', () => ({
  transact: async (callback) => {
    if (typeof callback === 'function') {
      return callback({
        authorize: async () => ({
          accounts: [{ address: 'test-wallet-address' }],
          auth_token: 'test-auth-token',
        }),
      });
    }
    return null;
  },
}));

jest.mock('@solana/web3.js', () => ({
  PublicKey: class PublicKey {
    constructor(value) {
      this.value = value;
    }

    toBase58() {
      return String(this.value ?? '');
    }
  },
}));

