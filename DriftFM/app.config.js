export default {
  expo: {
    name: "DriftFM",
    // ... other existing config
    extra: {
      "EXPO_PUBLIC_11LABS_API_KEY": process.env.EXPO_PUBLIC_11LABS_API_KEY,
    },
    plugins: [
      // ... other plugins
    ]
  }
}; 