import type {ImgHTMLAttributes} from 'react';
import {backgroundImageSources} from '../utils/backgroundImages.ts';

/** Sharp native source with downscaled variants; custom image URLs stay untouched. */
export function SceneImage({src='',sizes='100vw',...props}:ImgHTMLAttributes<HTMLImageElement>){
 const media=backgroundImageSources(src);
 if(!media)return <img src={src} sizes={sizes} {...props}/>;
 return <picture style={{display:'contents'}}><source type="image/webp" srcSet={media.webp} sizes={sizes}/><img src={media.src} srcSet={media.jpg} sizes={sizes} width={media.width} height={media.height} {...props}/></picture>;
}
