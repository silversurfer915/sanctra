import type {UserSettings} from '../types/index.ts';
export type StudyDetailsData = NonNullable<UserSettings['studyDetails']>;
export type StudyDetailKey = keyof StudyDetailsData;
export const STUDY_STATUSES = ['School student','College student','University student','Postgraduate student','Doctoral researcher','Working professional','Independent learner','Educator / teacher'] as const;
export const STUDY_STREAMS = ['General studies','Science · PCM','Science · PCB','Science · PCMB','Commerce','Humanities / Arts','Engineering / Technology','Computer science / IT','Medicine / Health sciences','Business / Management','Law','Social sciences','Natural sciences','Mathematics / Statistics','Languages / Literature','Design / Fine arts','Education','Vocational / Technical training','Interdisciplinary studies'] as const;
// Values stay strings in the existing settings map; custom and older values remain valid.
export function cleanStudyDetails(draft:StudyDetailsData):StudyDetailsData {
 return Object.fromEntries(Object.entries(draft).map(([key,value])=>[key,value?.trim().slice(0,80)||'']));
}
export function studyDetailChoice(value:string,options:readonly string[]):string {
 return !value?'':options.includes(value)?value:'__custom__';
}
const COUNTRY_CODES='AF AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW'.split(' ');
export const STUDY_COUNTRIES = (()=>{const names=new Intl.DisplayNames(['en'],{type:'region'});return COUNTRY_CODES.map(c=>names.of(c)||c).sort((a,b)=>a.localeCompare(b));})();
