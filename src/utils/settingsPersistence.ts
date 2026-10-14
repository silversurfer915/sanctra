import type {UserSettings} from '../types/index.ts';
/** Background choices are a single preference: absent custom media means cleared. */
export function resolveHydratedSettings(local:UserSettings,remote?:UserSettings):UserSettings {
 if(!remote||(remote.updatedAt||0)<=(local.updatedAt||0))return local;
 return {...local,...remote,customWallpaperUrl:remote.customWallpaperUrl,plusMotionWallpaperUrl:remote.plusMotionWallpaperUrl,plusMotionWallpaperEnabled:remote.plusMotionWallpaperEnabled??false};
}
/** Replace supplied top-level fields instead of recursively merging cleared settings. */
export function cloudPatchFields(data:object):string[]{return [...Object.keys(data).filter(key=>(data as Record<string,unknown>)[key]!==undefined),'lastSyncedAt'];}
