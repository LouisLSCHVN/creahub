import CryptoJS from 'crypto-js';

const SECRET_KEY = "1e2e3e4e5e6e7e8e9e0dzdzaeiozjfz289U8";

export const encrypt = (text: string): string => {
  try {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  } catch (error) {
    console.error('Erreur lors du chiffrement:', error);
    throw new Error('Échec du chiffrement');
  }
};

export const decrypt = (encryptedText: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Erreur lors du déchiffrement:', error);
    throw new Error('Échec du déchiffrement');
  }
};