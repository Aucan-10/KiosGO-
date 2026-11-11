import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';

// URL a la que Supabase devuelve al alumno después de un login externo (email o Google).
// En Expo Go, Linking.createURL devuelve kiosgo:// (el esquema del APK), que Expo Go no abre,
// así que ahí armamos la URL exp:// con el host del servidor de desarrollo.
export function getRedirectUrl(path: string): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient && hostUri) {
    return `exp://${hostUri}/--/${path}`;
  }
  return Linking.createURL(path);
}
