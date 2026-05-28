// jest.config.js
// Source: https://docs.expo.dev/develop/unit-testing/
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    // Map @/* imports to src/* matching the tsconfig path alias
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    // Allow jest to transform ESM packages: react-native ecosystem + Firebase rules testing
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@react-native-firebase/.*|nativewind|@firebase/rules-unit-testing)',
  ],
  // Use testEnvironment per-project for firestore rules tests (Node) vs RN tests (jsdom)
  projects: [
    {
      displayName: 'react-native',
      preset: 'jest-expo',
      testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@react-native-firebase/.*|nativewind)',
      ],
    },
    {
      displayName: 'firestore-rules',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/firestore/**/*.test.{ts,tsx}'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {}],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transformIgnorePatterns: [
        'node_modules/(?!@firebase/rules-unit-testing)',
      ],
    },
  ],
};
