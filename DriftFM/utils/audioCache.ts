import * as FileSystem from 'expo-file-system';

const CACHE_DIR = `${FileSystem.cacheDirectory}radio_intros/`;

export const AudioCache = {
  setup: async () => {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR);
    }
  },

  getIntroPath: (hostId: string) => {
    return `${CACHE_DIR}${hostId}.mp3`;
  },

  hasIntro: async (hostId: string) => {
    const path = AudioCache.getIntroPath(hostId);
    const fileInfo = await FileSystem.getInfoAsync(path);
    return fileInfo.exists;
  },

  saveIntro: async (hostId: string, audioData: ArrayBuffer) => {
    const path = AudioCache.getIntroPath(hostId);
    const uint8Array = new Uint8Array(audioData);
    const base64Data = btoa(
      uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    await FileSystem.writeAsStringAsync(path, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });
  },
}; 