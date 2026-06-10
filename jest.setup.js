// Jest setup for the `react-native` project.
//
// expo-router's real `useFocusEffect` reaches into React Navigation context to
// subscribe to focus events. Screen-unit tests render components without a
// NavigationContainer, so the real hook throws. Mock it to run the callback once
// like a plain effect (and honour its cleanup return) — that's all the unit tests
// need from it. Individual test files can still override expo-router with their own
// jest.mock if required.
jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  const React = require('react');
  return {
    ...actual,
    useFocusEffect: (callback) => React.useEffect(callback, [callback]),
  };
});
