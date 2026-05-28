// app.config.js
// Source: https://docs.expo.dev/guides/using-firebase/
const IS_DEV = process.env.APP_VARIANT === 'development';

module.exports = {
  expo: {
    name: IS_DEV ? 'TrainingCenter (Dev)' : 'TrainingCenter',
    slug: 'laufit',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'laufit',
    userInterfaceStyle: 'automatic',
    ios: {
      icon: './assets/expo.icon',
      bundleIdentifier: IS_DEV ? 'com.trainingcenter.dev' : 'com.trainingcenter',
      googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST ?? './GoogleService-Info.plist',
    },
    android: {
      package: IS_DEV ? 'com.trainingcenter.dev' : 'com.trainingcenter',
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
      adaptiveIcon: {
        backgroundColor: '#0E0E0E',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#0E0E0E',
          android: {
            image: './assets/images/splash-icon.png',
            imageWidth: 76,
          },
        },
      ],
      '@react-native-firebase/app',
      '@react-native-firebase/auth',
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
          },
        },
      ],
      'expo-secure-store',
      '@react-native-google-signin/google-signin',
    ],
    extra: {
      googleWebClientId: '911229291499-vs0j44h5ehl0bo6la8c4ks1r6if1on9n.apps.googleusercontent.com',
    },
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  },
};
