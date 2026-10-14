/** Keep Safari's surrounding canvas in sync after account appearance loads. */
export function syncBrowserChrome(ink:string,target:Document):void {
 target.documentElement.style.setProperty('--sanctra-boot-ink',ink);
 target.querySelector('meta[name="theme-color"]')?.setAttribute('content',ink);
}
